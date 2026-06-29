import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { submitPatientImport } from '$lib/server/repositories';
import { cedulaLast3 } from '@sismo-ve/schemas';

export const load: PageServerLoad = async ({ setHeaders }) => {
  setHeaders({
    'cache-control': 'no-store'
  });

  return {};
};

export const actions: Actions = {
  default: async ({ request }) => {
    const formData = await request.formData();

    const patient_name = String(formData.get('patient_name') ?? '').trim();
    const cedula = String(formData.get('cedula') ?? '').replace(/\D/g, '');
    const hospital = String(formData.get('hospital') ?? '').trim();
    const condition_public = String(formData.get('condition_public') ?? 'unknown').trim();
    const source_name = String(formData.get('source_name') ?? '').trim();
    const source_url = String(formData.get('source_url') ?? '').trim();
    const public_notes = String(formData.get('public_notes') ?? '').trim();

    if (!patient_name || cedula.length < 3) {
      return fail(400, {
        message: 'Completa el nombre y una cédula con al menos 3 dígitos.'
      });
    }

    const payload = {
      status: 'public_unverified',
      patient_name,
      cedula_last3: cedulaLast3(cedula),
      hospital: hospital || undefined,
      condition_public,
      source_type: 'public_reporter',
      verification_status: 'unverified',
      source_name: source_name || 'Formulario público',
      source_url: source_url || undefined,
      public_notes: public_notes || undefined
    };

    try {
      await submitPatientImport(payload);
      throw redirect(303, '/pacientes?created=1');
    } catch (error) {
      if (error instanceof Response) throw error;
      return fail(503, {
        message: 'La propuesta no se pudo guardar. La revisión queda pendiente de conexión.'
      });
    }
  }
};
