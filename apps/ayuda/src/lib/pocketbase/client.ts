import PocketBase from 'pocketbase';

const defaultUrl = 'https://api.sismo-ve.xyz';

export function createBrowserPocketBase() {
  const baseUrl = import.meta.env.PUBLIC_POCKETBASE_URL?.replace(/\/$/, '') ?? defaultUrl;
  return new PocketBase(baseUrl);
}
