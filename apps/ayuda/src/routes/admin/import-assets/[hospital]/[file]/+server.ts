import { error } from '@sveltejs/kit';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import type { RequestHandler } from './$types';
import { requireStaff } from '$lib/server/auth';

const ROOT = process.cwd().replace(/\/apps\/ayuda$/, '');
const EXTRACTED = path.join(ROOT, 'data/ingest/extracted');
const TYPES: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp'
};

type Manifest = {
  image_root_abs?: string;
  image_root?: string;
  images?: Array<{ name?: string; path?: string }>;
};

async function imageRoot(hospital: string): Promise<string | null> {
  let manifest: Manifest;
  try {
    manifest = JSON.parse(
      await readFile(path.join(EXTRACTED, hospital, 'manifest.json'), 'utf8')
    ) as Manifest;
  } catch {
    return null;
  }
  if (manifest.image_root_abs) return manifest.image_root_abs;
  if (manifest.image_root) return path.resolve(EXTRACTED, hospital, manifest.image_root);
  const withPath = manifest.images?.find((img) => img.path);
  if (withPath?.path) return path.dirname(withPath.path);
  return null;
}

export const GET: RequestHandler = async ({ locals, params, setHeaders }) => {
  requireStaff(locals.user);

  const hospital = params.hospital;
  if (hospital !== path.basename(hospital)) {
    throw error(400, 'Hospital inválido.');
  }

  const filename = decodeURIComponent(params.file);
  if (filename !== path.basename(filename)) {
    throw error(400, 'Nombre de archivo inválido.');
  }

  const ext = path.extname(filename).toLowerCase();
  const contentType = TYPES[ext];
  if (!contentType) {
    throw error(404, 'Imagen no encontrada.');
  }

  const root = await imageRoot(hospital);
  if (!root) {
    throw error(404, 'Imagen no encontrada.');
  }

  try {
    const body = await readFile(path.join(root, filename));
    setHeaders({
      'cache-control': 'private, no-store',
      'content-type': contentType
    });
    return new Response(body);
  } catch {
    throw error(404, 'Imagen no encontrada.');
  }
};
