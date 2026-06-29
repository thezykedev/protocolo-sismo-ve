import { error, redirect } from '@sveltejs/kit';

// Roles del backend (ver infra/pocketbase migraciones). "Editor" en la UI = moderator.
export type StaffRole = 'admin' | 'moderator' | 'hospital_staff' | 'volunteer';

export interface AuthUser {
  id: string;
  email: string;
  role?: StaffRole;
  display_name?: string;
  organization?: string;
  active?: boolean;
}

// Quien puede curar contenido (aprobar/editar/rechazar): admin o moderator (editor).
export function isStaff(user: AuthUser | null): boolean {
  return !!user && user.active !== false && (user.role === 'admin' || user.role === 'moderator');
}

export function isAdmin(user: AuthUser | null): boolean {
  return !!user && user.active !== false && user.role === 'admin';
}

// Para usar en load functions de rutas protegidas. Redirige a login si no autenticado,
// y bloquea (403) si está autenticado pero sin permisos de curaduría.
export function requireStaff(user: AuthUser | null, fromPath = '/admin'): AuthUser {
  if (!user) throw redirect(303, `/admin/login?next=${encodeURIComponent(fromPath)}`);
  if (!isStaff(user)) throw error(403, 'Tu cuenta no tiene permisos de curaduría.');
  return user;
}

export function requireAdmin(user: AuthUser | null, fromPath = '/admin'): AuthUser {
  if (!user) throw redirect(303, `/admin/login?next=${encodeURIComponent(fromPath)}`);
  if (!isAdmin(user)) throw error(403, 'Solo un administrador puede acceder aquí.');
  return user;
}
