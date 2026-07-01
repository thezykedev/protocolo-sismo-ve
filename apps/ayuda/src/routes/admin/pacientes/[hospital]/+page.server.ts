import { error } from '@sveltejs/kit';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import type { PageServerLoad } from './$types';
import { requireStaff } from '$lib/server/auth';

const ROOT = process.cwd().replace(/\/apps\/ayuda$/, '');
const DEFAULT_ATTRIBUTION = 'Venezuela Reporta — venezuelareporta.org';

type ManifestImage = { name: string; bytes?: number; on_disk?: boolean; path?: string };
type Manifest = {
  slug?: string;
  display_hospital?: string;
  hospital?: string;
  source_name?: string;
  image_root?: string;
  image_root_abs?: string;
  images?: ManifestImage[];
};

type ReviewRecord = {
  source_record_id: string;
  patient_name: string;
  age?: number;
  cedula_last3: string;
  condition_public?: string;
  public_notes?: string;
  source_url: string;
  _private?: { cedula_full?: string };
  _review: {
    source_image: string;
    source_line: number;
    raw_line: string;
    confidence: number;
    flags: string[];
  };
};

type VrBestMatch = {
  vr_id: string;
  nombre: string;
  edad: number | null;
  sexo: string | null;
  ubicacion: string | null;
  fecha: string | null;
  ficha_url: string | null;
  score: number;
  name_overlap: number;
  cedula_hint: boolean;
};

type VrRow = {
  source_record_id: string;
  status: 'matched' | 'only_ours';
  best_match: VrBestMatch | null;
};

type VrCrosscheck = {
  meta?: { attribution?: string };
  attribution?: string;
  rows?: VrRow[];
  vr_only?: unknown[];
  duplicates?: unknown[];
};

async function readJson<T>(file: string): Promise<T | null> {
  try {
    return JSON.parse(await readFile(file, 'utf8')) as T;
  } catch {
    return null;
  }
}

// Enlaces manuales de verificacion (el cruce CNE automatico fue retirado por falta de API estable).
function cneLinks(cedulaFull?: string) {
  if (!cedulaFull) return [];
  return [
    {
      label: 'CNE oficial',
      url: 'https://consultapopular.cne.gob.ve/',
      note: 'Sin API pública estable; copiar la cédula y pegar en el buscador.'
    },
    {
      label: 'SistemasPNP',
      url: 'https://www.sistemaspnp.com/cedula/',
      note: 'Fuente no oficial con CAPTCHA; apoyo manual.'
    },
    {
      label: 'Dateas',
      url: `https://www.dateas.com/es/servicio/personas/venezuela?q=${encodeURIComponent(cedulaFull)}`,
      note: 'Fuente no oficial.'
    }
  ];
}

export const load: PageServerLoad = async ({ locals, params }) => {
  requireStaff(locals.user);

  const slug = params.hospital;
  const outRoot = path.join(ROOT, 'data/ingest/extracted', slug);

  const manifest = await readJson<Manifest>(path.join(outRoot, 'manifest.json'));
  const review = await readJson<ReviewRecord[]>(path.join(outRoot, 'patients.review.json'));
  if (!manifest || !review) {
    throw error(404, 'No hay extracción para este hospital. Corre el ensamblador.');
  }

  const displayHospital = manifest.display_hospital || manifest.hospital || slug;
  const sourceName = manifest.source_name ?? '';

  const vr = await readJson<VrCrosscheck>(path.join(outRoot, 'vr-crosscheck.json'));
  const vrChecked = vr !== null;
  const vrRows = vr?.rows ?? [];
  const vrById = new Map(vrRows.map((row) => [row.source_record_id, row]));
  const attribution = vr?.meta?.attribution || vr?.attribution || DEFAULT_ATTRIBUTION;

  let pbStatusById = new Map<string, { id: string; status: string; verification_status?: string }>();
  try {
    const rows = await locals.pb.collection('patients_public').getFullList<{
      id: string;
      source_record_id: string;
      status: string;
      verification_status?: string;
    }>({
      filter: `source_name = "${sourceName}"`,
      fields: 'id,source_record_id,status,verification_status'
    });
    pbStatusById = new Map(rows.map((row) => [row.source_record_id, row]));
  } catch {
    pbStatusById = new Map();
  }

  function imageUrl(image: string) {
    return `/admin/import-assets/${slug}/${encodeURIComponent(image)}`;
  }

  // Orden de imagenes segun el manifiesto; se agregan al final las que solo aparezcan en la revision.
  const orderedNames = (manifest.images ?? []).map((img) => img.name);
  for (const record of review) {
    const name = record._review.source_image;
    if (!orderedNames.includes(name)) orderedNames.push(name);
  }

  const images = orderedNames.map((image) => ({
    image,
    image_url: imageUrl(image),
    records: review
      .filter((record) => record._review.source_image === image)
      .map((record) => {
        const cedulaFull = record._private?.cedula_full;
        const vrRow = vrById.get(record.source_record_id) ?? null;
        return {
          source_record_id: record.source_record_id,
          patient_name: record.patient_name,
          age: record.age,
          cedula_last3: record.cedula_last3,
          cedula_full: cedulaFull,
          condition_public: record.condition_public,
          public_notes: record.public_notes,
          raw_line: record._review.raw_line,
          source_line: record._review.source_line,
          confidence: Math.round(record._review.confidence * 100),
          flags: record._review.flags,
          pb: pbStatusById.get(record.source_record_id) ?? null,
          vr: vrRow?.best_match ?? null,
          vr_status: vrRow?.status,
          cne_links: cneLinks(cedulaFull)
        };
      })
  }));

  const vrMatched = vrRows.filter((row) => row.status === 'matched').length;
  const vrNew = vrRows.filter((row) => row.status === 'only_ours').length;

  return {
    generatedAt: new Date().toISOString(),
    slug,
    display_hospital: displayHospital,
    attribution,
    vrChecked,
    images,
    totals: {
      images: images.length,
      records: review.length,
      withCedulaFull: review.filter((record) => record._private?.cedula_full).length,
      lowConfidence: review.filter((record) => record._review.confidence < 0.7).length,
      vrMatched,
      vrNew,
      vrOnly: (vr?.vr_only ?? []).length,
      duplicates: (vr?.duplicates ?? []).length
    }
  };
};
