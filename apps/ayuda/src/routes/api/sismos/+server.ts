import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { loadSeismicSnapshot } from '$lib/server/seismic';

export const GET: RequestHandler = async ({ url, setHeaders }) => {
  const minMagnitude = Number(url.searchParams.get('minMagnitude') ?? '1');
  const hours = Number(url.searchParams.get('hours') ?? '24');
  const snapshot = await loadSeismicSnapshot(Number.isFinite(hours) ? hours : 24, Number.isFinite(minMagnitude) ? minMagnitude : 1);

  setHeaders({
    'cache-control': 'no-cache, max-age=60'
  });

  return json(snapshot);
};
