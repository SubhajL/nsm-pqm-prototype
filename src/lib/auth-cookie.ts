/**
 * PR-33 — HMAC-signed auth cookie seal/unseal (Edge-safe).
 *
 * The mock-auth cookies (`pqm_user_id`, `pqm_user_role`) used to be plain
 * text — anyone with devtools could impersonate any user by editing a
 * cookie value. Sealed format: `<value>.<base64url(HMAC-SHA256(secret,
 * "<cookieName>:<value>"))>`. Binding the cookie NAME into the MAC stops
 * a sealed role value from being replayed as a user-id (and vice versa).
 *
 * Web Crypto only (`globalThis.crypto.subtle`) so the same module runs in
 * the Edge middleware AND Node route handlers. Unit-test mocks need a
 * synchronous sealer — that lives in `auth-cookie-node.ts` (node:crypto)
 * and is drift-locked against this implementation by `auth-cookie.test.ts`.
 *
 * Secret comes from `AUTH_COOKIE_SECRET`; without it we fall back to a
 * committed dev constant so local dev/tests/preview keep working. The
 * committed constant is PUBLIC — anyone with repo access can mint valid
 * signatures with it — so production FAILS CLOSED: a missing secret
 * under `VERCEL_ENV=production` throws instead of silently accepting
 * forgeable cookies (the env var is provisioned in the Vercel project).
 * Verification fails closed too: tampered, truncated, unsigned, or
 * cross-cookie values all unseal to null (treated as logged out).
 */

/** Dev/preview/test fallback — never accepted in production. */
export const DEV_FALLBACK_AUTH_COOKIE_SECRET =
  'nsm-pqm-dev-cookie-secret-7c41a09b';

export function resolveAuthCookieSecret(): string {
  const configured = process.env.AUTH_COOKIE_SECRET;
  if (configured && configured.length > 0) return configured;
  if (process.env.VERCEL_ENV === 'production') {
    throw new Error(
      '[auth-cookie] AUTH_COOKIE_SECRET is not set in production. The ' +
        'committed dev fallback is public and would make every auth ' +
        'cookie forgeable — set the env var in the Vercel project.',
    );
  }
  return DEV_FALLBACK_AUTH_COOKIE_SECRET;
}

function macPayload(cookieName: string, value: string): string {
  return `${cookieName}:${value}`;
}

function toBase64Url(bytes: ArrayBuffer): string {
  const view = new Uint8Array(bytes);
  let binary = '';
  for (let i = 0; i < view.length; i += 1) {
    binary += String.fromCharCode(view[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function hmacSha256(secret: string, payload: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(payload));
  return toBase64Url(signature);
}

/** Seal `value` for `cookieName`: `value.signature`. */
export async function sealAuthCookieValue(
  cookieName: string,
  value: string,
): Promise<string> {
  const signature = await hmacSha256(
    resolveAuthCookieSecret(),
    macPayload(cookieName, value),
  );
  return `${value}.${signature}`;
}

/**
 * Verify and extract the value from a sealed cookie. Null on anything
 * that does not verify — absent, unsigned legacy values, tampering, or a
 * value sealed for a different cookie name.
 */
export async function unsealAuthCookieValue(
  cookieName: string,
  sealed: string | undefined | null,
): Promise<string | null> {
  if (!sealed) return null;
  const dotIndex = sealed.lastIndexOf('.');
  if (dotIndex <= 0 || dotIndex === sealed.length - 1) return null;
  const value = sealed.slice(0, dotIndex);
  const signature = sealed.slice(dotIndex + 1);
  const expected = await hmacSha256(
    resolveAuthCookieSecret(),
    macPayload(cookieName, value),
  );
  if (!timingSafeEqual(signature, expected)) return null;
  return value;
}

/**
 * Constant-time-ish comparison. Both inputs are base64url HMAC outputs of
 * fixed length, so a length mismatch is itself non-secret.
 */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}
