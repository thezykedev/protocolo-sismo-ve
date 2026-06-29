import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { isStaff, type AuthUser } from '$lib/server/auth';
import { checkLoginAllowed, registerFailure, registerSuccess } from '$lib/server/rate-limit';

function safeNext(next: string | null): string {
  return next && next.startsWith('/admin') ? next : '/admin';
}

// Retardo fijo en fallos: ralentiza la fuerza bruta y empareja el tiempo de respuesta
// entre "no existe" y "contraseña mala" para no filtrar qué correos existen.
function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export const load: PageServerLoad = async ({ locals, url }) => {
  // Si ya hay sesión válida de curaduría, no mostrar el login.
  if (isStaff(locals.user)) {
    throw redirect(303, safeNext(url.searchParams.get('next')));
  }
  return { next: safeNext(url.searchParams.get('next')) };
};

export const actions: Actions = {
  login: async ({ request, locals, getClientAddress }) => {
    const data = await request.formData();
    const email = String(data.get('email') ?? '').trim().toLowerCase();
    const password = String(data.get('password') ?? '');
    const next = safeNext(String(data.get('next') ?? '/admin'));

    if (!email || !password) {
      return fail(400, { error: 'Ingresa correo y contraseña.', email });
    }

    // Clave de rate limit por IP + correo: frena fuerza bruta sin castigar a otros usuarios.
    let ip = 'unknown';
    try {
      ip = getClientAddress();
    } catch {
      /* detrás de algunos proxies puede fallar en dev */
    }
    const rlKey = `${ip}:${email}`;
    const gate = checkLoginAllowed(rlKey);
    if (!gate.allowed) {
      return fail(429, {
        error: `Demasiados intentos. Reintenta en ${Math.ceil(gate.retryAfter / 60)} min.`,
        email
      });
    }

    try {
      await locals.pb.collection('users').authWithPassword(email, password);
    } catch {
      registerFailure(rlKey);
      await delay(400);
      return fail(400, { error: 'Credenciales inválidas.', email });
    }

    const record = locals.pb.authStore.record;
    // Misma definición de "curador" que el resto de la app: una sola fuente (isStaff).
    const ok = record
      ? isStaff({ id: record.id, email: record.email, role: record.role, active: record.active } as AuthUser)
      : false;
    if (!ok) {
      // Autenticó pero no es curador o está inactivo: no dejar entrar.
      locals.pb.authStore.clear();
      registerFailure(rlKey);
      await delay(400);
      return fail(403, { error: 'Tu cuenta no tiene permisos de curaduría.', email });
    }

    registerSuccess(rlKey);
    throw redirect(303, next);
  },

  logout: async ({ locals }) => {
    locals.pb.authStore.clear();
    throw redirect(303, '/admin/login');
  }
};
