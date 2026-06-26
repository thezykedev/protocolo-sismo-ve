import type { PageServerLoad } from './$types';
import { loadHospitals } from '$lib/server/repositories';

export const load: PageServerLoad = async ({ setHeaders }) => {
  setHeaders({
    'cache-control': 'no-cache, max-age=60'
  });

  const hospitals = await loadHospitals();

  return {
    hospitals,
    lastUpdatedAt: hospitals[0]?.updated_at ?? null
  };
};
