import type { LayoutServerLoad } from './$types';
import { backendStatus } from '$lib/server/repositories';

// El indicador global de estado se deriva del mismo seam de datos (repositories.backendStatus),
// no de una sonda /api/health propia del layout: una sola fuente decide "degradado" y la hora
// del snapshot, en línea con seismic.ts, que también reporta su propia procedencia.
export const load: LayoutServerLoad = async () => {
  const { online, snapshotAt } = await backendStatus();

  return {
    backend: {
      degraded: !online,
      snapshotAt
    }
  };
};
