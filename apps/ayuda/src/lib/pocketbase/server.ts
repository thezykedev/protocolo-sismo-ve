import PocketBase from 'pocketbase';

const defaultUrl = 'https://api.sismo-ve.xyz';

export function createServerPocketBase() {
  const baseUrl = process.env.PUBLIC_POCKETBASE_URL?.replace(/\/$/, '') ?? defaultUrl;
  return new PocketBase(baseUrl);
}

export async function authenticateAdmin(pb = createServerPocketBase()) {
  const email = process.env.POCKETBASE_ADMIN_EMAIL;
  const password = process.env.POCKETBASE_ADMIN_PASSWORD;

  if (email && password) {
    await pb.admins.authWithPassword(email, password);
  }

  return pb;
}
