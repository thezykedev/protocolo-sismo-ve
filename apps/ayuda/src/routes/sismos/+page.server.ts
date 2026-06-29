import type { PageServerLoad } from './$types';
import { loadSeismicSnapshot } from '$lib/server/seismic';

const timeWindows: Record<string, number> = {
  '1h': 1,
  '6h': 6,
  '24h': 24,
  '7d': 24 * 7,
  '30d': 24 * 30
};

export const load: PageServerLoad = async ({ setHeaders, url }) => {
  const requestedWindow = url.searchParams.get('window');
  const windowKey = requestedWindow && requestedWindow in timeWindows ? requestedWindow : '30d';
  const hours = timeWindows[windowKey] ?? 24 * 30;
  const minMagnitude = Number(url.searchParams.get('minMagnitude') ?? '1');
  const search = (url.searchParams.get('search') ?? '').trim();

  setHeaders({
    'cache-control': 'no-cache, max-age=60'
  });

  const snapshot = await loadSeismicSnapshot(hours, Number.isFinite(minMagnitude) ? minMagnitude : 1);

  const filteredEvents = snapshot.events.filter((event) => {
    if (event.magnitude < (Number.isFinite(minMagnitude) ? minMagnitude : 1)) return false;
    if (!search) return true;
    const haystack = [event.place, event.title, event.state_region, event.source].filter(Boolean).join(' ').toLowerCase();
    return haystack.includes(search.toLowerCase());
  });

  return {
    events: filteredEvents,
    snapshot,
    filters: {
      window: windowKey,
      minMagnitude: Number.isFinite(minMagnitude) ? minMagnitude : 1,
      search
    }
  };
};
