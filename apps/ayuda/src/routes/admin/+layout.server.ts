import type { LayoutServerLoad } from './$types';
import { requireStaff } from '$lib/server/auth';

export const load: LayoutServerLoad = async ({ locals, url }) => {
  // El login es público; el resto de /admin exige rol de curaduría (admin o moderator).
  if (url.pathname.startsWith('/admin/login')) {
    return { user: locals.user };
  }
  const user = requireStaff(locals.user, url.pathname);
  return { user };
};
