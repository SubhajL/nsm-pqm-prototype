import { describe, expect, it } from 'vitest';

import { sealAuthCookieValue, unsealAuthCookieValue } from './auth-cookie';
import { sealAuthCookieValueSync } from './auth-cookie-node';

const NAME = 'pqm_user_id';

describe('auth cookie sealing (PR-33)', () => {
  it('round-trips a sealed value', async () => {
    const sealed = await sealAuthCookieValue(NAME, 'user-002');
    expect(sealed).not.toBe('user-002');
    expect(await unsealAuthCookieValue(NAME, sealed)).toBe('user-002');
  });

  it('seals values containing spaces (roles like "System Admin")', async () => {
    const sealed = await sealAuthCookieValue('pqm_user_role', 'System Admin');
    expect(await unsealAuthCookieValue('pqm_user_role', sealed)).toBe(
      'System Admin',
    );
  });

  it('rejects a tampered value (the devtools impersonation vector)', async () => {
    const sealed = await sealAuthCookieValue(NAME, 'user-003');
    const signature = sealed.slice(sealed.lastIndexOf('.'));
    expect(await unsealAuthCookieValue(NAME, `user-001${signature}`)).toBeNull();
  });

  it('rejects a tampered signature', async () => {
    const sealed = await sealAuthCookieValue(NAME, 'user-003');
    expect(await unsealAuthCookieValue(NAME, `${sealed.slice(0, -2)}xx`)).toBeNull();
  });

  it('rejects a value sealed for a DIFFERENT cookie (no cross-cookie swaps)', async () => {
    const sealedRole = await sealAuthCookieValue('pqm_user_role', 'user-001');
    expect(await unsealAuthCookieValue(NAME, sealedRole)).toBeNull();
  });

  it('rejects legacy unsigned plain values', async () => {
    expect(await unsealAuthCookieValue(NAME, 'user-001')).toBeNull();
  });

  it('returns null for absent values', async () => {
    expect(await unsealAuthCookieValue(NAME, undefined)).toBeNull();
    expect(await unsealAuthCookieValue(NAME, '')).toBeNull();
  });

  it('sync (node:crypto) seal verifies under the async (Web Crypto) unseal — no impl drift', async () => {
    const sealed = sealAuthCookieValueSync(NAME, 'user-002');
    expect(sealed).toBe(await sealAuthCookieValue(NAME, 'user-002'));
    expect(await unsealAuthCookieValue(NAME, sealed)).toBe('user-002');
  });
});

describe('resolveAuthCookieSecret fail-closed (PR-33)', () => {
  it('throws in Vercel production when AUTH_COOKIE_SECRET is missing', async () => {
    const { resolveAuthCookieSecret } = await import('./auth-cookie');
    const prevVercelEnv = process.env.VERCEL_ENV;
    const prevSecret = process.env.AUTH_COOKIE_SECRET;
    process.env.VERCEL_ENV = 'production';
    delete process.env.AUTH_COOKIE_SECRET;
    try {
      expect(() => resolveAuthCookieSecret()).toThrowError(/AUTH_COOKIE_SECRET/);
      process.env.AUTH_COOKIE_SECRET = 'configured-secret';
      expect(resolveAuthCookieSecret()).toBe('configured-secret');
    } finally {
      if (prevVercelEnv === undefined) delete process.env.VERCEL_ENV;
      else process.env.VERCEL_ENV = prevVercelEnv;
      if (prevSecret === undefined) delete process.env.AUTH_COOKIE_SECRET;
      else process.env.AUTH_COOKIE_SECRET = prevSecret;
    }
  });
});
