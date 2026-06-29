import { fail, redirect, isRedirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { submitPatientImport } from '$lib/server/repositories';
import { parsePatientSubmission } from '@sismo-ve/schemas';

export const load: PageServerLoad = async ({ setHeaders }) => {
  setHeaders({
    'cache-control': 'no-store'
  });

  return {};
};

export const actions: Actions = {
  default: async ({ request }) => {
    const parsed = parsePatientSubmission(await request.formData());
    if (!parsed.ok) {
      return fail(400, { message: parsed.errors.join(' ') });
    }

    // Campos de sistema (no provienen del formulario público) sobre el valor ya limpio.
    const payload = {
      status: 'public_unverified',
      ...parsed.value,
      source_type: 'public_reporter',
      verification_status: 'unverified'
    };

    try {
      await submitPatientImport(payload);
      throw redirect(303, '/pacientes?created=1');
    } catch (error) {
      if (isRedirect(error)) throw error;
      return fail(503, {
        message: 'La propuesta no se pudo guardar. La revisión queda pendiente de conexión.'
      });
    }
  }
};
