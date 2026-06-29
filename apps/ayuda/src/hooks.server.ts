import PocketBase from 'pocketbase';
import { error, redirect, type Handle } from '@sveltejs/kit';
import { resolveBaseUrl } from '$lib/pocketbase/server';
import { isStaff, type AuthUser } from '$lib/server/auth';

// Refresca el token solo cuando le queda poco de vida, no en cada request: mantiene la
// sesión "deslizante" para usuarios activos sin golpear PocketBase (ni su rate limit) de más.
const REFRESH_IF_REMAINING_S = 6 * 60 * 60; // refrescar si quedan < 6h

function tokenSecondsRemaining(token: string): number {
  try {
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString('utf-8'));
    if (typeof payload.exp !== 'number') return 0;
    return payload.exp - Math.floor(Date.now() / 1000);
  } catch {
    return 0;
  }
}

export const handle: Handle = async ({ event, resolve }) => {
  const pb = new PocketBase(resolveBaseUrl());
  pb.authStore.loadFromCookie(event.request.headers.get('cookie') ?? '');

  try {
    if (pb.authStore.isValid && tokenSecondsRemaining(pb.authStore.token) < REFRESH_IF_REMAINING_S) {
      await pb.collection('users').authRefresh();
    }
  } catch {
    // token inválido/expirado o cuenta revocada: limpiar para forzar re-login
    pb.authStore.clear();
  }

  event.locals.pb = pb;
  const record = pb.authStore.isValid ? pb.authStore.record : null;
  event.locals.user = record
    ? ({
        id: record.id,
        email: record.email,
        role: record.role,
        display_name: record.display_name,
        organization: record.organization,
        active: record.active
      } as AuthUser)
    : null;

  // Control de acceso al panel en un solo seam: toda request a /admin (excepto el login)
  // debe ser de un curador. Las acciones de formulario NO atraviesan +layout.server.ts, así
  // que enforzar aquí cierra el hueco de una mutación sin guardia. Las rutas conservan su
  // requireStaff/requireAdmin como defensa en profundidad (y usuarios sigue exigiendo admin).
  const path = event.url.pathname;
  if (path.startsWith('/admin') && !path.startsWith('/admin/login')) {
    if (!event.locals.user) {
      throw redirect(303, `/admin/login?next=${encodeURIComponent(path)}`);
    }
    if (!isStaff(event.locals.user)) {
      throw error(403, 'Tu cuenta no tiene permisos de curaduría.');
    }
  }

  const response = await resolve(event);

  // Cabeceras de seguridad. DENY de framing evita clickjacking; nosniff evita MIME sniffing.
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  if (event.url.pathname.startsWith('/admin')) {
    // El panel no se indexa ni se cachea.
    response.headers.set('X-Robots-Tag', 'noindex, nofollow');
    response.headers.set('Cache-Control', 'no-store');
  }

  response.headers.append(
    'set-cookie',
    pb.authStore.exportToCookie({
      httpOnly: true,
      secure: event.url.protocol === 'https:',
      sameSite: 'Lax',
      path: '/'
    })
  );

  return response;
};
