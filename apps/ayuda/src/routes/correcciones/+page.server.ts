import { fail, redirect, isRedirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { submitQueuedRecord } from '$lib/server/repositories';

export const load: PageServerLoad = async ({ setHeaders }) => {
  setHeaders({
    'cache-control': 'no-store'
  });

  return {};
};

export const actions: Actions = {
  default: async ({ request }) => {
    const formData = await request.formData();
    const target_collection = String(formData.get('target_collection') ?? '').trim();
    const target_record = String(formData.get('target_record') ?? '').trim();
    const requester_name = String(formData.get('requester_name') ?? '').trim();
    const requester_contact = String(formData.get('requester_contact') ?? '').trim();
    const relationship = String(formData.get('relationship') ?? '').trim();
    const reason = String(formData.get('reason') ?? '').trim();

    if (!target_collection || !target_record || !requester_name || !reason) {
      return fail(400, {
        message: 'Completa la colección, el registro, tu nombre y el motivo.'
      });
    }

    try {
      await submitQueuedRecord('removal_requests', {
        target_collection,
        target_record,
        requester_name,
        requester_contact: requester_contact || undefined,
        relationship: relationship || undefined,
        reason,
        status: 'pending'
      });

      throw redirect(303, '/correcciones?sent=1');
    } catch (error) {
      if (isRedirect(error)) throw error;
      return fail(503, {
        message: 'La solicitud no se pudo guardar. La revisión queda pendiente de conexión.'
      });
    }
  }
};
