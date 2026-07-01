import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import type { PageServerLoad } from './$types';
import { requireStaff } from '$lib/server/auth';

const ROOT = process.cwd().replace(/\/apps\/ayuda$/, '');
const EXTRACTED = path.join(ROOT, 'data/ingest/extracted');

type Manifest = {
  slug?: string;
  display_hospital?: string;
  hospital?: string;
  records?: number;
  low_confidence?: number;
  with_cedula_full?: number;
  duplicates_dropped?: number;
  generated_at?: string;
};

async function fileExists(file: string) {
  try {
    await readFile(file);
    return true;
  } catch {
    return false;
  }
}

export const load: PageServerLoad = async ({ locals }) => {
  requireStaff(locals.user);

  let slugs: string[] = [];
  try {
    const entries = await readdir(EXTRACTED, { withFileTypes: true });
    slugs = entries.filter((e) => e.isDirectory()).map((e) => e.name);
  } catch {
    slugs = [];
  }

  const hospitals = [];
  for (const slug of slugs) {
    const dir = path.join(EXTRACTED, slug);
    let manifest: Manifest;
    try {
      manifest = JSON.parse(await readFile(path.join(dir, 'manifest.json'), 'utf8')) as Manifest;
    } catch {
      continue;
    }
    hospitals.push({
      slug,
      display_hospital: manifest.display_hospital || manifest.hospital || slug,
      records: manifest.records ?? 0,
      low_confidence: manifest.low_confidence ?? 0,
      with_cedula_full: manifest.with_cedula_full ?? 0,
      duplicates_dropped: manifest.duplicates_dropped ?? 0,
      vrChecked: await fileExists(path.join(dir, 'vr-crosscheck.json')),
      generated_at: manifest.generated_at ?? ''
    });
  }

  hospitals.sort((a, b) => a.display_hospital.localeCompare(b.display_hospital, 'es'));

  return { hospitals };
};
