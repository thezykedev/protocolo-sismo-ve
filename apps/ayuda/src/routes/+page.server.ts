import type { PageServerLoad } from './$types';
import { loadSeismicSnapshot } from '$lib/server/seismic';

// La home necesita el evento más reciente aunque haya calma: usamos una ventana amplia
// (7 días) para garantizar un "último sismo" y derivamos la actividad de 24h del mismo lote.
export const load: PageServerLoad = async ({ setHeaders }) => {
  setHeaders({
    'cache-control': 'no-cache, max-age=60'
  });

  const snapshot = await loadSeismicSnapshot(24 * 7, 1);
  const events = snapshot.events;
  const latest = events[0] ?? null;

  const dayAgo = Date.now() - 24 * 60 * 60 * 1000;
  const last24h = events.filter((event) => new Date(event.event_time).getTime() >= dayAgo);
  const maxMagnitude24h = last24h.reduce((max, event) => Math.max(max, event.magnitude), 0);

  return {
    latest,
    activity: {
      count24h: last24h.length,
      maxMagnitude24h: last24h.length ? maxMagnitude24h : null
    },
    snapshot: {
      lastSuccessfulAt: snapshot.lastSuccessfulAt,
      source: snapshot.source,
      degraded: snapshot.degraded
    }
  };
};
