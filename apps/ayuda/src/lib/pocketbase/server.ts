import PocketBase from 'pocketbase';
import { env } from '$env/dynamic/public';

const defaultUrl = 'https://api.sismo-ve.xyz';

// $env/dynamic/public es la forma correcta en SvelteKit de leer PUBLIC_*: en dev toma el
// valor de apps/ayuda/.env y en prod (adapter-node) de process.env. import.meta.env NO sirve
// porque el prefijo de Vite es VITE_, no PUBLIC_, y dejaba la app apuntando a producción.
export function resolveBaseUrl() {
  return (env.PUBLIC_POCKETBASE_URL || defaultUrl).replace(/\/$/, '');
}

export function createServerPocketBase() {
  return new PocketBase(resolveBaseUrl());
}

export async function authenticateAdmin(pb = createServerPocketBase()) {
  const email = process.env.POCKETBASE_ADMIN_EMAIL;
  const password = process.env.POCKETBASE_ADMIN_PASSWORD;

  if (email && password) {
    // PB >= 0.23: el superuser vive en la colección _superusers; pb.admins es el alias antiguo.
    try {
      await pb.collection('_superusers').authWithPassword(email, password);
    } catch {
      await (pb as unknown as { admins: { authWithPassword: (e: string, p: string) => Promise<unknown> } }).admins.authWithPassword(email, password);
    }
  }

  return pb;
}
