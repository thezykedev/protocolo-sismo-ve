import type { LayoutServerLoad } from './$types';
import { resolveBaseUrl } from '$lib/pocketbase/server';
import { fallbackSnapshotAt } from '$lib/server/fallback-db';

// Estado del backend para el indicador global. Si PocketBase no responde, la app sigue
// sirviendo el snapshot SQLite (estado degradado) e informa la hora de ese snapshot.
export const load: LayoutServerLoad = async ({ fetch }) => {
  let degraded = false;
  try {
    const response = await fetch(`${resolveBaseUrl()}/api/health`, {
      signal: AbortSignal.timeout(2500)
    });
    degraded = !response.ok;
  } catch {
    degraded = true;
  }

  return {
    backend: {
      degraded,
      snapshotAt: degraded ? fallbackSnapshotAt() : null
    }
  };
};
