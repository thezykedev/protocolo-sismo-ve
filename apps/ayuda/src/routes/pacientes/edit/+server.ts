import { json, error } from '@sveltejs/kit';
import { dev } from '$app/environment';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import type { RequestHandler } from './$types';
import { authenticateAdmin } from '$lib/pocketbase/server';
import { cedulaLast3, PATIENT_CONDITIONS } from '@sismo-ve/schemas';

// Herramienta de verificacion SOLO para desarrollo. En produccion no existe: las
// correcciones publicas van por formulario, no por edicion directa (ver CLAUDE.md).
// Persiste en data/ingest/corrections.json (auditoria) y refleja el cambio en PocketBase.

// cwd del dev server = apps/ayuda
const CORRECTIONS = path.resolve('../../data/ingest/corrections.json');

export const POST: RequestHandler = async ({ request }) => {
  if (!dev) throw error(403, 'Edicion directa deshabilitada fuera de desarrollo.');

  const body = await request.json();
  const id = String(body.id || '').trim();
  if (!id) throw error(400, 'Falta id.');

  // Sanitizar y validar solo los campos editables
  const fix: Record<string, unknown> = {};
  if (typeof body.patient_name === 'string') fix.patient_name = body.patient_name.trim();
  if (typeof body.public_notes === 'string') fix.public_notes = body.public_notes.trim();
  if (body.cedula_last3 !== undefined) {
    fix.cedula_last3 = cedulaLast3(String(body.cedula_last3)); // privacidad: jamas mas de 3 digitos
  }
  if (body.age !== undefined) {
    const n = parseInt(String(body.age), 10);
    fix.age = Number.isFinite(n) && n >= 0 && n <= 130 ? n : null;
  }
  if (body.condition_public !== undefined) {
    if (!(PATIENT_CONDITIONS as readonly string[]).includes(body.condition_public)) throw error(400, 'Estado invalido.');
    fix.condition_public = body.condition_public;
  }

  // 1) Persistir en la capa de correcciones (auditoria, sobrevive a regeneraciones)
  let corrections: Record<string, Record<string, unknown>> = {};
  if (existsSync(CORRECTIONS)) {
    corrections = JSON.parse(await readFile(CORRECTIONS, 'utf-8'));
  } else {
    await mkdir(path.dirname(CORRECTIONS), { recursive: true });
  }
  corrections[id] = { ...(corrections[id] || {}), ...fix };
  await writeFile(CORRECTIONS, JSON.stringify(corrections, null, 2) + '\n', 'utf-8');

  // 2) Reflejar en PocketBase (fuente de verdad). El id corresponde al source_record_id
  //    asignado durante el import. Si PB no está disponible, la corrección igual quedó
  //    auditada y se reaplicará en el próximo `pnpm pb:import`.
  const update: Record<string, unknown> = { verification_status: 'moderator_confirmed' };
  for (const [k, v] of Object.entries(fix)) update[k] = v === null ? '' : v;

  try {
    const pb = await authenticateAdmin();
    // pb.filter() escapa el valor: evita inyección en el filtro (corre como superuser).
    const record = await pb
      .collection('patients_public')
      .getFirstListItem(pb.filter('source_record_id = {:id}', { id }));
    const saved = await pb.collection('patients_public').update(record.id, update);
    return json({ ok: true, record: saved });
  } catch (err) {
    return json({
      ok: true,
      pending: true,
      message:
        'Corrección guardada en auditoría. PocketBase no respondió o el registro no existe aún; se aplicará al reimportar.',
      detail: err instanceof Error ? err.message : String(err)
    });
  }
};
