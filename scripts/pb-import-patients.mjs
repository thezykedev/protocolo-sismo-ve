#!/usr/bin/env node
// Importa pacientes a PocketBase desde el staging SQLite gitignored (data/ingest/staging.db,
// tabla patients_public(id, json)). Si no existe, intenta el JSON legacy
// apps/ayuda/src/lib/server/fallbackPatients.json. Hace upsert por source_record_id.
//
// Uso (con superuser para idempotencia/dedup completa):
//   POCKETBASE_ADMIN_EMAIL=... POCKETBASE_ADMIN_PASSWORD=... pnpm import:patients
import { fileURLToPath } from 'node:url';
import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// Las deps (better-sqlite3, pocketbase) viven en apps/ayuda; resolvemos desde ahí.
const requireFromApp = createRequire(path.join(ROOT, 'apps/ayuda/package.json'));
const Database = requireFromApp('better-sqlite3');
const PocketBaseImport = requireFromApp('pocketbase');
const PocketBase = PocketBaseImport.default ?? PocketBaseImport;
const PB_URL = (process.env.PUBLIC_POCKETBASE_URL || 'http://127.0.0.1:8090').replace(/\/$/, '');
const STAGING = process.env.STAGING_DB_PATH || path.join(ROOT, 'data/ingest/staging.db');
const LEGACY_JSON = path.join(ROOT, 'apps/ayuda/src/lib/server/fallbackPatients.json');

function loadStagingRecords() {
  if (existsSync(STAGING)) {
    const db = new Database(STAGING, { readonly: true });
    try {
      const rows = db.prepare('SELECT json FROM patients_public').all();
      return { source: STAGING, records: rows.map((r) => JSON.parse(r.json)) };
    } finally {
      db.close();
    }
  }
  if (existsSync(LEGACY_JSON)) {
    return { source: LEGACY_JSON, records: JSON.parse(readFileSync(LEGACY_JSON, 'utf8')) };
  }
  return { source: null, records: [] };
}

// "26/6/2026" (d/m/yyyy) -> ISO; cualquier otra cosa no parseable -> undefined.
function toIsoDate(value) {
  if (!value) return undefined;
  const dmy = String(value).match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (dmy) {
    const [, d, m, y] = dmy;
    const date = new Date(Number(y), Number(m) - 1, Number(d));
    return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed.toISOString();
}

function normalize(record) {
  const cedula = String(record.cedula_last3 ?? '').replace(/\D/g, '');
  return {
    status: record.status === 'pending' ? 'public_unverified' : record.status || 'public_unverified',
    patient_name: record.patient_name || 'Registro sin nombre',
    age: typeof record.age === 'number' ? record.age : undefined,
    cedula_last3: /^[0-9]{3}$/.test(cedula) ? cedula : '000',
    hospital: record.hospital || undefined,
    condition_public: record.condition_public || 'unknown',
    last_seen_at: toIsoDate(record.last_seen_at),
    source_type: record.source_type || 'hospital_staff',
    verification_status: record.verification_status || 'unverified',
    source_name: record.source_name || 'Import',
    source_url: record.source_url || undefined,
    source_record_id: String(record.source_record_id || record.id || ''),
    public_notes: record.public_notes || undefined,
    imported_at: record.imported_at || new Date().toISOString()
  };
}

const pb = new PocketBase(PB_URL);

const email = process.env.POCKETBASE_ADMIN_EMAIL;
const password = process.env.POCKETBASE_ADMIN_PASSWORD;
let authed = false;
if (email && password) {
  try {
    await pb.collection('_superusers').authWithPassword(email, password);
    authed = true;
  } catch {
    try {
      await pb.admins.authWithPassword(email, password);
      authed = true;
    } catch {
      console.warn('Aviso: no se pudo autenticar como superuser; el dedup será limitado.');
    }
  }
}

const { source, records } = loadStagingRecords();
if (!source) {
  console.error('No se encontró staging.db ni JSON legacy. Nada que importar.');
  process.exit(1);
}
console.log(`Fuente: ${source}\nRegistros: ${records.length}\nPocketBase: ${PB_URL} (auth: ${authed})\n`);

let created = 0;
let updated = 0;
let failed = 0;
for (const raw of records) {
  const payload = normalize(raw);
  if (!payload.source_record_id) {
    // sin id estable: crear sin dedup
    try {
      await pb.collection('patients_public').create(payload);
      created++;
    } catch (error) {
      failed++;
      console.warn(`! create falló: ${error?.message ?? error}`);
    }
    continue;
  }
  try {
    const existing = await pb
      .collection('patients_public')
      .getFirstListItem(`source_record_id = "${payload.source_record_id}"`);
    await pb.collection('patients_public').update(existing.id, payload);
    updated++;
  } catch {
    try {
      await pb.collection('patients_public').create(payload);
      created++;
    } catch (error) {
      failed++;
      console.warn(`! ${payload.source_record_id}: ${error?.message ?? error}`);
    }
  }
}

console.log(`\nListo. Creados: ${created} · Actualizados: ${updated} · Fallidos: ${failed}`);
