#!/usr/bin/env node
// Genera el snapshot SQLite de respaldo desde PocketBase. Una tabla por colección pública
// con filas (id, json) + tabla `_snapshot_meta`. La app lo lee cuando PocketBase no responde.
//
// Uso (resuelve deps desde apps/ayuda):
//   pnpm fallback:snapshot
//   PUBLIC_POCKETBASE_URL=https://api.sismo-ve.xyz pnpm fallback:snapshot
import { fileURLToPath } from 'node:url';
import { mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// Las deps (better-sqlite3, pocketbase) viven en apps/ayuda. Resolvemos desde ahí para que
// el script funcione sin importar el cwd ni la ubicación de scripts/.
const requireFromApp = createRequire(path.join(ROOT, 'apps/ayuda/package.json'));
const Database = requireFromApp('better-sqlite3');
const PocketBaseImport = requireFromApp('pocketbase');
const PocketBase = PocketBaseImport.default ?? PocketBaseImport;
const PB_URL = (process.env.PUBLIC_POCKETBASE_URL || 'http://127.0.0.1:8090').replace(/\/$/, '');
const OUT = process.env.FALLBACK_DB_PATH || path.join(ROOT, 'apps/ayuda/.fallback/fallback.db');

// Solo colecciones públicas, con el mismo filtro que usan las reglas/lecturas de la app.
const PUBLIC_COLLECTIONS = {
  hospitals: 'status = "approved"',
  collection_centers: 'status = "approved"',
  allied_sites: 'status = "approved"',
  useful_links: 'status = "approved"',
  patients_public: 'status != "archived"',
  seismic_events: 'status = "active"'
};

const pb = new PocketBase(PB_URL);

mkdirSync(path.dirname(OUT), { recursive: true });
const db = new Database(OUT);
db.pragma('journal_mode = DELETE'); // archivo único portable (sin -wal)
db.exec('CREATE TABLE IF NOT EXISTS _snapshot_meta(key TEXT PRIMARY KEY, value TEXT)');

let total = 0;
for (const [collection, filter] of Object.entries(PUBLIC_COLLECTIONS)) {
  let items = [];
  try {
    items = await pb.collection(collection).getFullList({ filter, sort: '-updated_at', batch: 500 });
  } catch (error) {
    console.warn(`! ${collection}: ${error?.message ?? error}`);
  }
  db.exec(`DROP TABLE IF EXISTS "${collection}"`);
  db.exec(`CREATE TABLE "${collection}"(id TEXT PRIMARY KEY, json TEXT NOT NULL)`);
  const insert = db.prepare(`INSERT OR REPLACE INTO "${collection}"(id, json) VALUES (?, ?)`);
  const writeAll = db.transaction((rows) => {
    for (const row of rows) insert.run(String(row.id), JSON.stringify(row));
  });
  writeAll(items);
  total += items.length;
  console.log(`✓ ${collection}: ${items.length}`);
}

const setMeta = db.prepare('INSERT OR REPLACE INTO _snapshot_meta(key, value) VALUES (?, ?)');
setMeta.run('generated_at', new Date().toISOString());
setMeta.run('source_url', PB_URL);
db.close();

console.log(`\nSnapshot escrito en ${OUT} (${total} registros).`);
