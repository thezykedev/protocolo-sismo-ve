#!/usr/bin/env node
// Ensamblador determinista hospital-agnóstico: convierte la salida de visión por imagen
// (data/ingest/extracted/<slug>/by-image/<img>.json) en los artefactos que consumen la app y el
// import a PocketBase. CERO tokens: toda la inteligencia de visión ya ocurrió aguas arriba; aquí
// solo se redacta, deduplica y arma con provenance.
//
// Entrada por imagen (contrato con los agentes de visión):
//   { hospital, source_image, list_title?, fecha?, rows:[ {
//       item?, nombre, apellido?, cedula_last3?, cedula_full?, edad?, sexo?,
//       alergia?, diagnostico?, egreso?, ubicacion?, confianza:"alta"|"media"|"baja", raw?, notas? } ] }
//
// Salida en data/ingest/extracted/<slug>/:
//   patients.review.json   (privado: registros completos con _review y _private — para moderación)
//   patients.import.json   (público: solo campos publicables, cedula_last3, sin texto crudo)
//   patients.private.json  (privado: cedula_full por registro, sólo moderadores)
//   manifest.json          (metadatos: display, source_name, image_root, imágenes, por-imagen)
//
// Privacidad (CLAUDE.md): público expone SOLO cedula_last3; la cédula completa vive sólo en el lado
// privado; public_notes lleva un resumen clínico breve SIN secuencias numéricas (PII).
//
// Uso: node scripts/assemble-hospital.mjs --slug <slug>
//      node scripts/assemble-hospital.mjs --slug <slug> --single <archivo.json>   (una lista, no by-image)

import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { hospitalBySlug, imageRootFor, extractRootFor } from './hospitals.mjs';

const RUN_AT = new Date().toISOString();
const ADMIN_BASE = (process.env.AYUDA_ADMIN_BASE_URL || 'http://127.0.0.1:5173').replace(/\/$/, '');
const CONFIDENCE = { alta: 0.92, media: 0.72, baja: 0.5 };

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--slug') out.slug = argv[++i];
    else if (argv[i] === '--single') out.single = argv[++i];
    else if (argv[i] === '--from-review') out.fromReview = true;
  }
  return out;
}

function slugify(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 90);
}

function normalizeName(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function onlyDigits(value) {
  return String(value ?? '').replace(/\D/g, '');
}

function cedulaLast3(value) {
  const d = onlyDigits(value);
  return d ? d.slice(-3).padStart(3, '0') : '000';
}

function cedulaFull(value) {
  const d = onlyDigits(value);
  return d.length >= 6 && d.length <= 9 ? d : undefined;
}

// public_notes = resumen clínico breve, SIN secuencias numéricas largas (cédulas/teléfonos).
function scrubNotes(value) {
  return String(value ?? '')
    .replace(/\bV[-\s]?\d[\d.\s]{4,}\b/gi, ' ')
    .replace(/\b\d[\d.\s]{5,}\b/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .replace(/\s*[·|/]\s*[·|/]\s*/g, ' · ')
    .replace(/^[\s·|/-]+|[\s·|/-]+$/g, '')
    .trim();
}

function conditionOf(row) {
  const hay = `${row.diagnostico ?? ''} ${row.egreso ?? ''} ${row.notas ?? ''}`.toLowerCase();
  if (/fallecid|sin signos vitales|obito|óbito/.test(hay)) return 'deceased_unconfirmed';
  if (/\balta\b|egres/.test(hay)) return 'discharged';
  if (row.diagnostico || /hospital|piso|emerg|trauma|cirug|uci|quirof/.test(hay)) return 'hospitalized';
  return 'unknown';
}

function confidenceOf(row) {
  const key = String(row.confianza ?? '').toLowerCase();
  return CONFIDENCE[key] ?? 0.6;
}

function fullName(row) {
  return [row.nombre, row.apellido].map((p) => String(p ?? '').trim()).filter(Boolean).join(' ').trim();
}

function readByImage(byImageDir) {
  const files = readdirSync(byImageDir)
    .filter((n) => n.toLowerCase().endsWith('.json'))
    .sort((a, b) => a.localeCompare(b, 'es'));
  return files.map((f) => ({ file: f, doc: JSON.parse(readFileSync(path.join(byImageDir, f), 'utf8')) }));
}

// Normaliza una fila cruda + su imagen a un registro completo (con _review/_private).
function toRecord(row, sourceImage, lineNo, imageOrder, hospital) {
  const patientName = fullName(row);
  const score = Math.round(confidenceOf(row) * 100);
  const idSlug = `${slugify(sourceImage)}-${String(lineNo).padStart(3, '0')}`;
  const flags = [];
  if (!row.cedula_last3 && !row.cedula_full) flags.push('missing_cedula');
  if (row.edad == null) flags.push('missing_age');
  if (patientName.split(/\s+/).filter(Boolean).length < 2) flags.push('short_name');
  if (/\?|ileg|blur|parcial|partial/i.test(`${row.raw ?? ''} ${row.notas ?? ''}`)) flags.push('uncertain_text');

  const publicNotes = scrubNotes(
    [
      row.diagnostico ? `Dx: ${row.diagnostico}` : '',
      row.alergia ? `Alergia: ${row.alergia}` : '',
      row.ubicacion ? `Ubicacion: ${row.ubicacion}` : '',
      row.egreso ? `Egreso: ${row.egreso}` : ''
    ]
      .filter(Boolean)
      .join(' · ')
  );

  return {
    status: 'public_unverified',
    patient_name: patientName,
    age: typeof row.edad === 'number' ? row.edad : row.edad ? Number(onlyDigits(row.edad)) || undefined : undefined,
    sex: row.sexo === 'f' || row.sexo === 'm' ? row.sexo : undefined,
    cedula_last3: cedulaLast3(row.cedula_last3 ?? row.cedula_full ?? ''),
    hospital: hospital.display,
    location_note: row.ubicacion ? scrubNotes(row.ubicacion) || undefined : undefined,
    condition_public: conditionOf(row),
    source_type: 'hospital_staff',
    verification_status: 'unverified',
    source_name: hospital.source_name,
    source_url: `${ADMIN_BASE}/admin/import-assets/${hospital.slug}/${encodeURIComponent(sourceImage)}?confidence=${score}`,
    source_record_id: `${hospital.slug}:${idSlug}:c${score}`,
    imported_at: RUN_AT,
    public_notes: publicNotes || undefined,
    _private: { cedula_full: cedulaFull(row.cedula_full ?? '') },
    _review: {
      source_image: sourceImage,
      source_line: lineNo,
      image_order: imageOrder,
      raw_line: row.raw || `${row.item ?? lineNo}. ${patientName}${row.edad ? ` (${row.edad})` : ''}${row.diagnostico ? ` - ${row.diagnostico}` : ''}`,
      confidence: confidenceOf(row),
      flags
    }
  };
}

// Dedup dentro del hospital: fotos superpuestas repiten filas. Clave = nombre normalizado + edad.
// Conserva la de mayor confianza; reporta cuántas se descartaron.
function dedupe(records) {
  const byKey = new Map();
  const kept = [];
  let dropped = 0;
  for (const r of records) {
    const key = `${normalizeName(r.patient_name)}|${r.age ?? ''}`;
    const prev = byKey.get(key);
    if (!prev) {
      byKey.set(key, r);
      kept.push(r);
      continue;
    }
    dropped++;
    if (r._review.confidence > prev._review.confidence) {
      // reemplaza la conservada por la de mayor confianza
      const idx = kept.indexOf(prev);
      if (idx >= 0) kept[idx] = r;
      byKey.set(key, r);
    }
  }
  return { kept, dropped };
}

function toPublic(record) {
  const copy = { ...record };
  delete copy._review;
  delete copy._private;
  return copy;
}

function toPrivate(record) {
  const cf = record._private?.cedula_full;
  if (!cf) return null;
  return {
    source_record_id: record.source_record_id,
    patient_name: record.patient_name,
    cedula_full: cf,
    cedula_last3: record.cedula_last3,
    source_image: record._review.source_image,
    source_line: record._review.source_line,
    source_name: record.source_name,
    imported_at: record.imported_at
  };
}

function writeJson(file, payload) {
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, `${JSON.stringify(payload, null, 2)}\n`);
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const hospital = hospitalBySlug(args.slug);
  if (!hospital) throw new Error(`Slug desconocido: ${args.slug}. Ver scripts/hospitals.mjs`);

  const outRoot = extractRootFor(hospital);
  const byImageDir = path.join(outRoot, 'by-image');
  const imageRoot = imageRootFor(hospital);

  // Modo reconstrucción: re-deriva import/private/manifest desde un patients.review.json ya armado
  // (p. ej. hospitales extraídos antes del contrato by-image). No re-corre visión ni re-parsea.
  if (args.fromReview) {
    const reviewFile = path.join(outRoot, 'patients.review.json');
    if (!existsSync(reviewFile)) throw new Error(`No existe ${reviewFile}`);
    const records = JSON.parse(readFileSync(reviewFile, 'utf8'));
    rebuildArtifacts(records, hospital, outRoot, imageRoot, { dropped: 0, rawCount: records.length });
    return;
  }

  let docs;
  if (args.single) {
    const doc = JSON.parse(readFileSync(args.single, 'utf8'));
    docs = [{ file: path.basename(args.single), doc }];
  } else {
    if (!existsSync(byImageDir)) {
      throw new Error(`No existe ${byImageDir}. Corre primero la extracción de visión (by-image/*.json).`);
    }
    docs = readByImage(byImageDir);
  }

  const rawRecords = [];
  const perImage = [];
  for (let i = 0; i < docs.length; i++) {
    const { doc } = docs[i];
    const sourceImage = doc.source_image;
    const rows = Array.isArray(doc.rows) ? doc.rows : [];
    let kept = 0;
    rows.forEach((row, idx) => {
      if (!fullName(row) || fullName(row).length < 3) return;
      rawRecords.push(toRecord(row, sourceImage, row.item ?? idx + 1, i + 1, hospital));
      kept++;
    });
    perImage.push({ image: sourceImage, list_title: doc.list_title ?? null, fecha: doc.fecha ?? null, rows_in: rows.length, records: kept });
  }

  const { kept: records, dropped } = dedupe(rawRecords);
  writeJson(path.join(outRoot, 'patients.review.json'), records);
  rebuildArtifacts(records, hospital, outRoot, imageRoot, { dropped, rawCount: rawRecords.length, perImage });
}

// Escribe import/private/manifest desde una lista de registros ya normalizados. Compartido por el
// flujo normal y por --from-review. Si no se pasa perImage, lo deriva agrupando por source_image.
function rebuildArtifacts(records, hospital, outRoot, imageRoot, { dropped = 0, rawCount = records.length, perImage } = {}) {
  const publicRecords = records.map(toPublic);
  const privateRecords = records.map(toPrivate).filter(Boolean);

  if (!perImage) {
    const byImage = new Map();
    for (const r of records) {
      const img = r._review?.source_image ?? 'desconocida';
      const p = byImage.get(img) ?? { image: img, list_title: null, fecha: null, rows_in: 0, records: 0 };
      p.rows_in++;
      p.records++;
      byImage.set(img, p);
    }
    perImage = [...byImage.values()];
  }

  // Manifiesto de imágenes (para la UI y el asset server). Si la imagen no está en disco, se
  // registra igual con bytes=null para no romper el ensamblado.
  const images = perImage.map((p) => {
    const file = path.join(imageRoot, p.image);
    let bytes = null;
    try { bytes = statSync(file).size; } catch { bytes = null; }
    return { name: p.image, bytes, on_disk: bytes != null };
  });

  const manifest = {
    generated_at: RUN_AT,
    slug: hospital.slug,
    display_hospital: hospital.display,
    source_name: hospital.source_name,
    image_root: path.relative(extractRootFor(hospital), imageRoot).split(path.sep).join('/'),
    image_root_abs: imageRoot,
    records: records.length,
    records_before_dedupe: rawCount,
    duplicates_dropped: dropped,
    with_cedula_full: privateRecords.length,
    low_confidence: records.filter((r) => r._review?.confidence < 0.7).length,
    images,
    per_image: perImage
  };

  const publicJsonText = JSON.stringify(publicRecords);
  writeJson(path.join(outRoot, 'patients.import.json'), publicRecords);
  writeJson(path.join(outRoot, 'patients.private.json'), privateRecords);
  writeJson(path.join(outRoot, 'manifest.json'), manifest);

  console.log(
    JSON.stringify(
      {
        slug: hospital.slug,
        hospital: hospital.display,
        records: records.length,
        duplicates_dropped: dropped,
        with_cedula_full: privateRecords.length,
        low_confidence: manifest.low_confidence,
        images: images.length,
        // guardas de privacidad: el import público no debe tener cédula completa ni texto crudo.
        public_has_full_cedula: /"cedula_full"/.test(publicJsonText) || /cedula(?!_last3)/i.test(publicJsonText),
        public_has_raw_line: /raw_line/.test(publicJsonText),
        outRoot
      },
      null,
      2
    )
  );
}

main();
