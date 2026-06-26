import type { PageServerLoad } from './$types';
import { loadPatients } from '$lib/server/repositories';

export const load: PageServerLoad = async ({ setHeaders }) => {
  setHeaders({
    'cache-control': 'no-store'
  });

  const patients = await loadPatients();

  return {
    patients
  };
};
