import type { PageServerLoad } from './$types';
import { loadAlliedSites } from '$lib/server/repositories';

export const load: PageServerLoad = async ({ setHeaders }) => {
  setHeaders({
    'cache-control': 'no-cache, max-age=60'
  });

  const allies = await loadAlliedSites();

  return {
    allies,
    lastUpdatedAt: allies[0]?.updated_at ?? null
  };
};
