import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { requireAdmin } from '$lib/server/auth';
import { createServerPocketBase, authenticateAdmin } from '$lib/pocketbase/server';

// Roles que se pueden asignar desde la UI. "Editor" = moderator (cura contenido).
const ASSIGNABLE = ['admin', 'moderator'];

export const load: PageServerLoad = async ({ locals }) => {
  requireAdmin(locals.user);
  let users: Array<Record<string, unknown>> = [];
  let loadError: string | null = null;
  try {
    const res = await locals.pb.collection('users').getList(1, 200, { sort: '-created' });
    users = res.items.map((u) => ({
      id: u.id,
      email: u.email,
      role: u.role,
      display_name: u.display_name,
      organization: u.organization,
      active: u.active
    }));
  } catch (e) {
    loadError = e instanceof Error ? e.message : 'No se pudo leer la lista.';
  }
  return { users, loadError };
};

export const actions: Actions = {
  create: async ({ request, locals }) => {
    requireAdmin(locals.user);
    const data = await request.formData();
    const email = String(data.get('email') ?? '').trim();
    const password = String(data.get('password') ?? '');
    const role = String(data.get('role') ?? '');
    const display_name = String(data.get('display_name') ?? '').trim();

    if (!email || !password) return fail(400, { error: 'Correo y contraseña son obligatorios.', email });
    if (password.length < 8) return fail(400, { error: 'La contraseña debe tener al menos 8 caracteres.', email });
    if (!ASSIGNABLE.includes(role)) return fail(400, { error: 'Rol inválido.', email });

    // Crear usuarios exige superuser (createRule = null). Ya validamos que quien pide es admin.
    const su = await authenticateAdmin(createServerPocketBase());
    try {
      await su.collection('users').create({
        email,
        password,
        passwordConfirm: password,
        role,
        display_name: display_name || email,
        active: true,
        verified: true,
        emailVisibility: false
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'No se pudo crear el colaborador.';
      return fail(400, { error: `${msg} (¿correo ya usado?)`, email });
    }
    return { ok: true, created: email };
  },

  toggle: async ({ request, locals }) => {
    const me = requireAdmin(locals.user);
    const data = await request.formData();
    const id = String(data.get('id') ?? '');
    const active = String(data.get('active') ?? '') === 'true';
    if (!id) return fail(400, { error: 'Falta id.' });
    if (id === me.id) return fail(400, { error: 'No puedes desactivar tu propia cuenta.' });
    try {
      await locals.pb.collection('users').update(id, { active });
    } catch (e) {
      return fail(400, { error: e instanceof Error ? e.message : 'No se pudo actualizar.' });
    }
    return { ok: true };
  }
};
