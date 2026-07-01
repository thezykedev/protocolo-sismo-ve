#!/usr/bin/env node
// Verifica nuestros registros de pacientes extraidos contra la API abierta de
// Venezuela Reporta (GET /api/v1/ingresos), listas de ingresos hospitalarios
// aportadas por la comunidad — la misma fuente que nuestra data.
//
// El cruce es por NOMBRE + EDAD (el cruce por cedula fue descartado). Responde,
// por hospital: cuales de nuestros registros tambien estan en VR (matched),
// cuales son nuevos (solo nuestros) y cuales registros de VR nos faltan (vr_only).
// Tambien marca duplicados internos en nuestro set. Nunca se escribe la cedula
// completa: VR ni siquiera la expone (cedula viene null o enmascarada) y nosotros
// solo conservamos cedula_last3.
//
// Uso:
//   node scripts/verify-venezuelareporta.mjs --in <patients.review.json> \
//        [--hospital "<nombre para cruzar contra ubicacion de VR>"] \
//        [--hospital-slug <slug>] [--out <dir>] [--refresh]
import { fileURLToPath } from 'node:url';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const VR_API = 'https://venezuelareporta.org/api/v1/ingresos';
const ATTRIBUTION = 'Venezuela Reporta — venezuelareporta.org';
const CACHE_PATH = path.join(ROOT, 'data/ingest/venezuelareporta/ingresos-cache.json');
const CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const PAGE_DELAY_MS = 600;
const PAGE_LIMIT = 100;

// --- Interfaz pura y testeable: normalizacion y solapamiento de nombres ---

// NFD, sin diacriticos, minusculas, tokens [a-z0-9], descartando tokens de <=2.
export function normalize(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter((t) => t.length > 2);
}

// |interseccion| / max(|a|,|b|) sobre conjuntos de tokens (0..1), sin importar orden.
export function nameOverlap(a, b) {
  const ta = new Set(normalize(a));
  const tb = new Set(normalize(b));
  if (ta.size === 0 || tb.size === 0) return 0;
  let inter = 0;
  for (const t of ta) if (tb.has(t)) inter += 1;
  return inter / Math.max(ta.size, tb.size);
}

// true si todos los tokens de `needle` estan en `haystack` (ambos arrays).
function tokensContain(haystack, needle) {
  if (needle.length === 0) return false;
  const set = new Set(haystack);
  return needle.every((t) => set.has(t));
}

// Dos ultimos digitos "reales" de la cedula de VR ("V-12••••78" -> "78"),
// tolerando el caso comun de cedula null.
function vrCedulaLast2(cedula) {
  const digits = String(cedula ?? '').match(/\d/g);
  if (!digits || digits.length < 2) return null;
  return digits.slice(-2).join('');
}

// --- CLI ---

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const key = argv[i];
    if (!key.startsWith('--')) continue;
    const name = key.slice(2);
    const next = argv[i + 1];
    if (next === undefined || next.startsWith('--')) {
      args[name] = true;
    } else {
      args[name] = next;
      i += 1;
    }
  }
  return args;
}

// --- Fetch con paginacion + cache ---

async function fetchAllIngresos({ refresh }) {
  if (!refresh && existsSync(CACHE_PATH)) {
    try {
      const cached = JSON.parse(readFileSync(CACHE_PATH, 'utf8'));
      const age = Date.now() - new Date(cached.fetched_at).getTime();
      if (Number.isFinite(age) && age < CACHE_TTL_MS && Array.isArray(cached.personas)) {
        console.error(`Usando cache (${Math.round(age / 60000)} min): ${cached.personas.length} registros.`);
        return cached;
      }
    } catch {
      /* cache corrupta: se ignora y se re-descarga */
    }
  }

  const personas = [];
  let total = 0;
  try {
    for (let offset = 0; ; offset += PAGE_LIMIT) {
      const url = `${VR_API}?limit=${PAGE_LIMIT}&offset=${offset}`;
      const res = await fetch(url, { headers: { accept: 'application/json' } });
      if (!res.ok) throw new Error(`HTTP ${res.status} en offset ${offset}`);
      const json = await res.json();
      total = json.total ?? total;
      const page = Array.isArray(json.personas) ? json.personas : [];
      if (page.length === 0) break;
      personas.push(...page);
      process.stderr.write(`\rDescargando VR: ${personas.length}/${total || '?'}   `);
      if (total && offset + PAGE_LIMIT >= total) break;
      await new Promise((r) => setTimeout(r, PAGE_DELAY_MS));
    }
    process.stderr.write('\n');
  } catch (error) {
    if (existsSync(CACHE_PATH)) {
      console.error(`\nRed no disponible (${error.message}). Usando cache existente.`);
      return JSON.parse(readFileSync(CACHE_PATH, 'utf8'));
    }
    throw new Error(
      `No se pudo descargar VR /ingresos y no hay cache en ${CACHE_PATH}: ${error.message}`
    );
  }

  const dataset = { fetched_at: new Date().toISOString(), total: total || personas.length, personas };
  mkdirSync(path.dirname(CACHE_PATH), { recursive: true });
  writeFileSync(CACHE_PATH, JSON.stringify(dataset));
  return dataset;
}

// --- Cruce ---

function agesCompatible(ourAge, vrAge) {
  if (typeof ourAge !== 'number' || typeof vrAge !== 'number') return true;
  return Math.abs(ourAge - vrAge) <= 1;
}

function buildHospitalPool(personas, hospital) {
  if (!hospital) return { pool: personas, filtered: false };
  const hospTokens = normalize(hospital);
  const pool = personas.filter((p) => {
    const ubicTokens = normalize(p.ubicacion);
    return tokensContain(ubicTokens, hospTokens) || tokensContain(hospTokens, ubicTokens);
  });
  if (pool.length === 0) return { pool: personas, filtered: false };
  return { pool, filtered: true };
}

function bestMatchFor(ours, pool) {
  const ourLast2 = String(ours.cedula_last3 ?? '').replace(/\D/g, '').slice(-2);
  let best = null;
  for (const vr of pool) {
    if (!agesCompatible(ours.age, vr.edad)) continue;
    const overlap = nameOverlap(ours.patient_name, vr.nombre);
    if (overlap === 0) continue;
    const vrLast2 = vrCedulaLast2(vr.cedula);
    const cedulaHint = ourLast2.length === 2 && vrLast2 !== null && vrLast2 === ourLast2;
    const score = Math.min(1, overlap + (cedulaHint ? 0.1 : 0));
    if (!best || score > best.score) {
      best = { vr, score, name_overlap: overlap, cedula_hint: cedulaHint };
    }
  }
  return best;
}

function crosscheck(records, dataset, hospital) {
  const { pool, filtered } = buildHospitalPool(dataset.personas, hospital);
  const rows = [];
  const matchedVrIds = new Set();
  let matched = 0;
  let onlyOurs = 0;

  for (const rec of records) {
    const best = bestMatchFor(rec, pool);
    const isMatch = best !== null && best.score >= 0.6;
    if (isMatch) {
      matched += 1;
      matchedVrIds.add(best.vr.id);
    } else {
      onlyOurs += 1;
    }
    rows.push({
      source_record_id: rec.source_record_id,
      patient_name: rec.patient_name,
      age: typeof rec.age === 'number' ? rec.age : null,
      cedula_last3: rec.cedula_last3 ?? null,
      source_image: rec._review?.source_image ?? null,
      source_line: rec._review?.source_line ?? null,
      status: isMatch ? 'matched' : 'only_ours',
      best_match: best
        ? {
            vr_id: best.vr.id,
            nombre: best.vr.nombre,
            edad: best.vr.edad ?? null,
            sexo: best.vr.sexo ?? null,
            ubicacion: best.vr.ubicacion ?? null,
            fecha: best.vr.fecha ?? null,
            ficha_url: best.vr.ficha_url ?? null,
            score: Number(best.score.toFixed(3)),
            name_overlap: Number(best.name_overlap.toFixed(3)),
            cedula_hint: best.cedula_hint
          }
        : null
    });
  }

  const vrOnly = pool
    .filter((p) => !matchedVrIds.has(p.id))
    .map((p) => ({
      vr_id: p.id,
      nombre: p.nombre,
      edad: p.edad ?? null,
      sexo: p.sexo ?? null,
      ubicacion: p.ubicacion ?? null,
      fecha: p.fecha ?? null,
      ficha_url: p.ficha_url ?? null
    }));

  const duplicates = [];
  for (let i = 0; i < records.length; i += 1) {
    for (let j = i + 1; j < records.length; j += 1) {
      const a = records[i];
      const b = records[j];
      const sameAge =
        (typeof a.age !== 'number' && typeof b.age !== 'number') || a.age === b.age;
      if (!sameAge) continue;
      const overlap = nameOverlap(a.patient_name, b.patient_name);
      if (overlap >= 0.85) {
        duplicates.push({
          a: a.source_record_id,
          b: b.source_record_id,
          name_overlap: Number(overlap.toFixed(3)),
          age: typeof a.age === 'number' ? a.age : null
        });
      }
    }
  }

  return {
    meta: {
      generated_at: new Date().toISOString(),
      hospital: hospital || null,
      attribution: ATTRIBUTION,
      vr_total: dataset.total,
      vr_hospital_pool: filtered ? pool.length : null,
      our_total: records.length,
      matched,
      only_ours: onlyOurs,
      vr_only: vrOnly.length,
      internal_duplicates: duplicates.length
    },
    attribution: ATTRIBUTION,
    rows,
    vr_only: vrOnly,
    duplicates
  };
}

// --- Entrada ---

async function main() {
  const args = parseArgs(process.argv.slice(2));

  let inPath = args.in;
  if (!inPath && args['hospital-slug']) {
    inPath = path.join(ROOT, 'data/ingest/extracted', args['hospital-slug'], 'patients.review.json');
  }
  if (!inPath) {
    console.error('Falta --in <patients.review.json> (o --hospital-slug <slug>).');
    process.exit(1);
  }
  inPath = path.resolve(inPath);
  if (!existsSync(inPath)) {
    console.error(`No existe el archivo de entrada: ${inPath}`);
    process.exit(1);
  }

  const records = JSON.parse(readFileSync(inPath, 'utf8'));
  if (!Array.isArray(records)) {
    console.error('El archivo de entrada debe ser un array de registros.');
    process.exit(1);
  }

  const hospital = typeof args.hospital === 'string' ? args.hospital : undefined;
  const dataset = await fetchAllIngresos({ refresh: Boolean(args.refresh) });
  const result = crosscheck(records, dataset, hospital);

  const outDir = args.out ? path.resolve(args.out) : path.dirname(inPath);
  mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, 'vr-crosscheck.json');
  writeFileSync(outPath, `${JSON.stringify(result, null, 2)}\n`);

  console.error(`\nEscrito: ${outPath}`);
  console.log(JSON.stringify(result.meta, null, 2));
}

// Solo corre si se invoca como script (permite importar las funciones puras).
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
}
