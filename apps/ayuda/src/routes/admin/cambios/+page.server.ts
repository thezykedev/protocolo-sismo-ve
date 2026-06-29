import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { requireStaff } from '$lib/server/auth';
import { PUBLIC_PATCH_FIELDS, sanitizePublicPatch } from '@sismo-ve/schemas';
import { moderate, pocketBaseModerationStore } from '$lib/server/moderation';

export const load: PageServerLoad = async ({ locals }) => {
  requireStaff(locals.user);
  let changes: Array<Record<string, any>> = [];
  let loadError: string | null = null;
  try {
    const res = await locals.pb.collection('updates_queue').getList(1, 200, {
      filter: 'status = "pending"',
      sort: '-created_at'
    });
    changes = res.items.map((c) => {
      let parsed: Record<string, unknown> | null = null;
      let parseError = false;
      try {
        parsed = c.payload_json ? JSON.parse(c.payload_json) : {};
      } catch {
        parseError = true;
      }
      const allowed = parsed ? sanitizePublicPatch(c.target_collection, parsed) : {};
      return { ...c, parsed_allowed: allowed, parse_error: parseError };
    });
  } catch (e) {
    loadError = e instanceof Error ? e.message : 'No se pudo leer la cola.';
  }
  return { changes, loadError };
};

export const actions: Actions = {
  accept: async ({ request, locals }) => {
    const user = requireStaff(locals.user);
    const data = await request.formData();
    const id = String(data.get('id') ?? '');
    const targetCollection = String(data.get('target_collection') ?? '');
    const targetRecord = String(data.get('target_record') ?? '');
    if (!id) return fail(400, { error: 'Falta id.' });
    if (!(targetCollection in PUBLIC_PATCH_FIELDS) || !targetRecord) {
      return fail(400, { error: 'El cambio no apunta a un registro editable.' });
    }

    const store = pocketBaseModerationStore(locals.pb);

    // Releer el envío del backend (no confiar en campos del form) y aplicar solo lo permitido.
    let patch: Record<string, unknown> = {};
    try {
      const rec = await store.getOne('updates_queue', id);
      const raw = rec.payload_json ? JSON.parse(String(rec.payload_json)) : {};
      patch = sanitizePublicPatch(targetCollection, raw);
    } catch {
      return fail(400, { error: 'No se pudo leer el cambio sugerido (JSON inválido).' });
    }
    if (Object.keys(patch).length === 0) {
      return fail(400, { error: 'El cambio no contiene campos públicos válidos.' });
    }

    const result = await moderate(store, {
      apply: { collection: targetCollection, id: targetRecord, fields: patch, required: true },
      resolve: { collection: 'updates_queue', id, status: 'accepted' },
      audit: {
        action: 'update',
        moderator: user.email,
        collection: targetCollection,
        record: targetRecord,
        notes: 'Cambio sugerido por la comunidad, aplicado.'
      }
    });
    if (!result.ok) return fail(400, { error: result.error });
    return { ok: true, message: 'Cambio aplicado.' };
  },

  reject: async ({ request, locals }) => {
    const user = requireStaff(locals.user);
    const data = await request.formData();
    const id = String(data.get('id') ?? '');
    if (!id) return fail(400, { error: 'Falta id.' });
    const result = await moderate(pocketBaseModerationStore(locals.pb), {
      resolve: { collection: 'updates_queue', id, status: 'rejected' },
      audit: { action: 'reject', moderator: user.email, collection: 'updates_queue', record: id, notes: 'Cambio sugerido rechazado.' }
    });
    if (!result.ok) return fail(400, { error: result.error });
    return { ok: true, message: 'Cambio rechazado.' };
  }
};
