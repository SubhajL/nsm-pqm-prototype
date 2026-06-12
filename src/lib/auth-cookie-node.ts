/**
 * PR-33 — synchronous (node:crypto) sealer for unit-test cookie mocks.
 *
 * `vi.mock('next/headers')` factories expose a synchronous `get()`, so
 * tests cannot await the Web-Crypto sealer in `auth-cookie.ts`. This
 * node-only twin produces byte-identical output — locked by the
 * cross-implementation case in `auth-cookie.test.ts`. Do NOT import from
 * Edge code (middleware) — node:crypto is unavailable there.
 */
import { createHmac } from 'node:crypto';

import { resolveAuthCookieSecret } from './auth-cookie';

export function sealAuthCookieValueSync(cookieName: string, value: string): string {
  const signature = createHmac('sha256', resolveAuthCookieSecret())
    .update(`${cookieName}:${value}`)
    .digest('base64url');
  return `${value}.${signature}`;
}
