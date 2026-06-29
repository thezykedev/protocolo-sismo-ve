import Database from 'better-sqlite3';
import { existsSync } from 'node:fs';
import path from 'node:path';

// Lector del snapshot de respaldo (solo lectura). El snapshot es un SQLite generado por
// `pnpm fallback:snapshot` desde PocketBase: una tabla por colección pública con filas
// (id, json) y una tabla `_snapshot_meta`. Si el archivo no existe, todo degrada a vacío.

function resolveDbPath(): string {
  const fromEnv = process.env.FALLBACK_DB_PATH;
  if (fromEnv) return fromEnv;
  // En dev el cwd es apps/ayuda; en prod (adapter-node) suele ser la raíz del build.
  return path.resolve(process.cwd(), '.fallback', 'fallback.db');
}

let cached: Database.Database | null = null;
let cachedPath: string | null = null;

function open(): Database.Database | null {
  const dbPath = resolveDbPath();
  if (!existsSync(dbPath)) return null;
  if (cached && cachedPath === dbPath) return cached;
  try {
    cached = new Database(dbPath, { readonly: true, fileMustExist: true });
    cachedPath = dbPath;
    return cached;
  } catch {
    return null;
  }
}

export function fallbackList<T>(collection: string): T[] {
  const db = open();
  if (!db) return [];
  try {
    // El nombre de colección proviene de una lista fija en repositories.ts, no de input
    // de usuario; aun así lo limitamos a identificadores seguros por defensa.
    if (!/^[a-z_]+$/.test(collection)) return [];
    const rows = db.prepare(`SELECT json FROM "${collection}"`).all() as Array<{ json: string }>;
    return rows.map((row) => JSON.parse(row.json) as T);
  } catch {
    return [];
  }
}

export function fallbackSnapshotAt(): string | null {
  const db = open();
  if (!db) return null;
  try {
    const row = db
      .prepare(`SELECT value FROM _snapshot_meta WHERE key = 'generated_at'`)
      .get() as { value: string } | undefined;
    return row?.value ?? null;
  } catch {
    return null;
  }
}
