import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { requireStaff } from '$lib/server/auth';
import { cedulaLast3, PATIENT_CONDITIONS } from '@sismo-ve/schemas';
import { moderate, pocketBaseModerationStore, type ModerationAction } from '$lib/server/moderation';

const COLLECTION = 'patients_public';

export const load: PageServerLoad = async ({ locals }) => {
  requireStaff(locals.user);
  let patients: Record<string, unknown>[] = [];
  let loadError: string | null = null;
  try {
    const res = await locals.pb.collection(COLLECTION).getList(1, 200, {
      filter: 'status = "pending" || status = "public_unverified"',
      sort: '-created_at'
    });
    patients = res.items;
  } catch (e) {
    loadError = e instanceof Error ? e.message : 'No se pudo leer del backend.';
  }
  return { patients, loadError };
};

// Las tres acciones de estado (verificar/rechazar/archivar) son la misma transición: fijar
// el estado del registro y auditar. Solo cambian el estado destino y la acción de bitácora.
async function transition(
  locals: App.Locals,
  request: Request,
  status: string,
  action: ModerationAction
) {
  const user = requireStaff(locals.user);
  const id = String((await request.formData()).get('id') ?? '');
  if (!id) return fail(400, { error: 'Falta id.' });

  const result = await moderate(pocketBaseModerationStore(locals.pb), {
    resolve: { collection: COLLECTION, id, status },
    audit: { action, moderator: user.email, collection: COLLECTION, record: id }
  });
  if (!result.ok) return fail(400, { error: result.error });
  return { ok: true };
}

export const actions: Actions = {
  approve: ({ request, locals }) => transition(locals, request, 'verified', 'approve'),
  reject: ({ request, locals }) => transition(locals, request, 'rejected', 'reject'),
  archive: ({ request, locals }) => transition(locals, request, 'archived', 'archive'),

  save: async ({ request, locals }) => {
    const user = requireStaff(locals.user);
    const data = await request.formData();
    const id = String(data.get('id') ?? '');
    if (!id) return fail(400, { error: 'Falta id.' });

    const cedulaDigits = String(data.get('cedula_last3') ?? '').replace(/\D/g, '');
    const patch: Record<string, unknown> = {
      patient_name: String(data.get('patient_name') ?? '').trim(),
      cedula_last3: cedulaLast3(cedulaDigits),
      public_notes: String(data.get('public_notes') ?? '').trim()
    };

    const ageRaw = String(data.get('age') ?? '').trim();
    if (ageRaw === '') {
      patch.age = null;
    } else {
      const n = parseInt(ageRaw, 10);
      if (!Number.isFinite(n) || n < 0 || n > 130) return fail(400, { error: 'Edad inválida.' });
      patch.age = n;
    }

    const condition = String(data.get('condition_public') ?? '');
    if (condition && !(PATIENT_CONDITIONS as readonly string[]).includes(condition)) {
      return fail(400, { error: 'Estado inválido.' });
    }
    if (condition) patch.condition_public = condition;

    if (!cedulaDigits) return fail(400, { error: 'La C.I. parcial debe tener 3 dígitos.' });
    if (!patch.patient_name) return fail(400, { error: 'El nombre es obligatorio.' });

    const result = await moderate(pocketBaseModerationStore(locals.pb), {
      apply: { collection: COLLECTION, id, fields: patch, required: true },
      audit: { action: 'update', moderator: user.email, collection: COLLECTION, record: id, notes: 'Edición de campos públicos.' }
    });
    if (!result.ok) return fail(400, { error: result.error });
    return { ok: true, saved: id };
  }
};
