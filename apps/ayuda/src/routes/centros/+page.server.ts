import type { PageServerLoad } from './$types';
import { loadCenters } from '$lib/server/repositories';

export const load: PageServerLoad = async ({ setHeaders }) => {
  setHeaders({
    'cache-control': 'no-cache, max-age=60'
  });

  const centers = await loadCenters();

  return {
    centers
  };
};
