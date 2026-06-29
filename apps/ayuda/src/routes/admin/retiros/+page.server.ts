import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { requireStaff } from '$lib/server/auth';
import { moderate, pocketBaseModerationStore } from '$lib/server/moderation';

// Colecciones públicas cuyo registro puede archivarse por una solicitud de retiro.
const ARCHIVABLE = ['patients_public', 'hospitals', 'collection_centers', 'allied_sites', 'useful_links'];

export const load: PageServerLoad = async ({ locals }) => {
  requireStaff(locals.user);
  let requests: Array<Record<string, unknown>> = [];
  let loadError: string | null = null;
  try {
    const res = await locals.pb.collection('removal_requests').getList(1, 200, {
      filter: 'status = "pending"',
      sort: '-created_at'
    });
    requests = res.items;
  } catch (e) {
    loadError = e instanceof Error ? e.message : 'No se pudo leer la cola.';
  }
  return { requests, loadError };
};

export const actions: Actions = {
  accept: async ({ request, locals }) => {
    const user = requireStaff(locals.user);
    const data = await request.formData();
    const id = String(data.get('id') ?? '');
    const targetCollection = String(data.get('target_collection') ?? '');
    const targetRecord = String(data.get('target_record') ?? '');
    if (!id) return fail(400, { error: 'Falta id.' });

    // Aceptar = retirar de lo público (archivar el destino, si lo hay) + cerrar la solicitud.
    // El archivado es best-effort: si el destino ya no existe, la solicitud igual se cierra.
    const canArchive = ARCHIVABLE.includes(targetCollection) && Boolean(targetRecord);
    const result = await moderate(pocketBaseModerationStore(locals.pb), {
      apply: canArchive
        ? { collection: targetCollection, id: targetRecord, fields: { status: 'archived' }, required: false }
        : undefined,
      resolve: { collection: 'removal_requests', id, status: 'accepted' },
      audit: {
        action: 'archive',
        moderator: user.email,
        collection: canArchive ? targetCollection : 'removal_requests',
        record: canArchive ? targetRecord : id,
        notes: 'Retiro solicitado por la comunidad.'
      }
    });
    if (!result.ok) return fail(400, { error: result.error });

    const archiveNote = canArchive ? (result.note ?? '') : ' (sin registro destino válido para archivar)';
    return { ok: true, message: `Solicitud aceptada${archiveNote}.` };
  },

  reject: async ({ request, locals }) => {
    const user = requireStaff(locals.user);
    const data = await request.formData();
    const id = String(data.get('id') ?? '');
    if (!id) return fail(400, { error: 'Falta id.' });
    const result = await moderate(pocketBaseModerationStore(locals.pb), {
      resolve: { collection: 'removal_requests', id, status: 'rejected' },
      audit: { action: 'reject', moderator: user.email, collection: 'removal_requests', record: id, notes: 'Solicitud de retiro rechazada.' }
    });
    if (!result.ok) return fail(400, { error: result.error });
    return { ok: true, message: 'Solicitud rechazada.' };
  }
};
