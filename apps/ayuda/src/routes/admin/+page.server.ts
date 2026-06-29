import type { PageServerLoad } from './$types';
import { requireStaff } from '$lib/server/auth';

export const load: PageServerLoad = async ({ locals }) => {
  requireStaff(locals.user);
  const pb = locals.pb;

  const count = async (collection: string, filter: string): Promise<number | null> => {
    try {
      const res = await pb.collection(collection).getList(1, 1, { filter });
      return res.totalItems;
    } catch {
      return null;
    }
  };

  // "Por revisar" = lo mismo que muestra /admin/pacientes: pendientes + públicos sin verificar.
  const [pendingPatients, pendingUpdates, pendingRemovals] = await Promise.all([
    count('patients_public', 'status = "pending" || status = "public_unverified"'),
    count('updates_queue', 'status = "pending"'),
    count('removal_requests', 'status = "pending"')
  ]);

  return { pendingPatients, pendingUpdates, pendingRemovals };
};
