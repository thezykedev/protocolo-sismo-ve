import PocketBase from 'pocketbase';
import { error, redirect, type Handle } from '@sveltejs/kit';
import { resolveBaseUrl } from '$lib/pocketbase/server';
import { isStaff, type AuthUser } from '$lib/server/auth';

export const handle: Handle = async ({ event, resolve }) => {
  const pb = new PocketBase(resolveBaseUrl());
  pb.authStore.loadFromCookie(event.request.headers.get('cookie') ?? '');

  // authStore.isValid SOLO comprueba la expiración del token, no su firma (el SDK no tiene el
  // secreto del servidor): una cookie pb_auth forjada con un `exp` lejano pasaría como "válida"
  // y locals.user (que gobierna la autorización del panel) quedaría bajo control del atacante.
  // Por eso, ante cualquier sesión presente, se valida SIEMPRE contra PocketBase: authRefresh
  // comprueba la firma y devuelve el record autoritativo (rol/active reales). Si falla
  // (forjado/expirado/revocado) se limpia la sesión. authRefresh además desliza el token, así
  // que la sesión sigue viva para usuarios legítimos.
  try {
    if (pb.authStore.isValid) {
      await pb.collection('users').authRefresh();
    }
  } catch {
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
