import type { PageServerLoad } from './$types';
import { loadUsefulLinks } from '$lib/server/repositories';

export const load: PageServerLoad = async ({ setHeaders }) => {
  setHeaders({
    'cache-control': 'no-cache, max-age=300'
  });

  const links = await loadUsefulLinks();

  return {
    links
  };
};
