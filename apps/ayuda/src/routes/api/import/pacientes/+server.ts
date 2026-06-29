import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { normalizePatientSnapshot } from '$lib/imports/patient-source';
import { submitPatientImport } from '$lib/server/repositories';
import { isStaff } from '$lib/server/auth';

export const POST: RequestHandler = async ({ request, locals, setHeaders }) => {
  // Importación masiva = herramienta de operador, no formulario público (el alta pública de un
  // solo registro va por pacientes/registrar). Exige curaduría; locals.user está validado
  // server-side en hooks.server.ts.
  if (!isStaff(locals.user)) {
    throw error(401, 'No autorizado.');
  }

  setHeaders({
    'cache-control': 'no-store'
  });

  const payload = await request.json().catch(() => null);
  const html = String(payload?.html ?? '').trim();
  const sourceName = String(payload?.sourceName ?? payload?.source_name ?? 'manual snapshot').trim();
  const sourceUrl = String(payload?.sourceUrl ?? payload?.source_url ?? '').trim();

  if (!html) {
    throw error(400, 'Falta HTML de origen');
  }

  const records = normalizePatientSnapshot({ html, sourceName, sourceUrl });

  try {
    await Promise.all(records.map((record) => submitPatientImport(record)));
  } catch {
    // Continue returning the normalized payload so operators can inspect the result locally.
  }

  return json({
    count: records.length,
    records
  });
};
