// Rate limiter en memoria para frenar fuerza bruta en el login. Es por-instancia (no
// compartido entre réplicas); PocketBase tiene su propio rate limiting como segunda capa.
// Ventana deslizante simple: cuenta intentos fallidos por clave (IP + email).

interface Bucket {
  count: number;
  resetAt: number;
  blockedUntil: number;
}

const buckets = new Map<string, Bucket>();
const WINDOW_MS = 15 * 60 * 1000; // 15 min
const MAX_ATTEMPTS = 7; // intentos fallidos por ventana
const BLOCK_MS = 15 * 60 * 1000; // bloqueo tras superar el límite

// Limpieza perezosa para que el Map no crezca sin límite.
function sweep(now: number) {
  if (buckets.size < 5000) return;
  for (const [k, b] of buckets) {
    if (b.resetAt < now && b.blockedUntil < now) buckets.delete(k);
  }
}

export function checkLoginAllowed(key: string, now = Date.now()): { allowed: boolean; retryAfter: number } {
  const b = buckets.get(key);
  if (b && b.blockedUntil > now) {
    return { allowed: false, retryAfter: Math.ceil((b.blockedUntil - now) / 1000) };
  }
  return { allowed: true, retryAfter: 0 };
}

export function registerFailure(key: string, now = Date.now()): void {
  sweep(now);
  let b = buckets.get(key);
  if (!b || b.resetAt < now) {
    b = { count: 0, resetAt: now + WINDOW_MS, blockedUntil: 0 };
    buckets.set(key, b);
  }
  b.count += 1;
  if (b.count >= MAX_ATTEMPTS) {
    b.blockedUntil = now + BLOCK_MS;
  }
}

export function registerSuccess(key: string): void {
  buckets.delete(key);
}
