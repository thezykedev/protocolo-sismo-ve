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
    const proposed_name = String(formData.get('proposed_name') ?? '').trim();
    const proposed_contact = String(formData.get('proposed_contact') ?? '').trim();
    const payload = String(formData.get('payload') ?? '').trim();

    if (!target_collection || !proposed_name || !payload) {
      return fail(400, {
        message: 'Completa el tipo de aporte, el nombre y el detalle.'
      });
    }

    try {
      await submitQueuedRecord('updates_queue', {
        target_collection,
        target_record: 'new',
        payload_json: JSON.stringify({ proposed_name, proposed_contact, payload }),
        submitted_by_name: proposed_name,
        submitted_by_contact: proposed_contact || undefined,
        status: 'pending'
      });

      throw redirect(303, '/colaborar?sent=1');
    } catch (error) {
      if (isRedirect(error)) throw error;
      return fail(503, {
        message: 'La propuesta no se pudo guardar. La revisión queda pendiente de conexión.'
      });
    }
  }
};
