import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// ---------------------------------------------------------------------------
// Phase 1 — `/api/audit-logs` admin-only gating.
//
// Pre-Phase-1 the route relied on middleware.ts gating, which read from a
// static seed of users.json — admin-UI mutations never reached it. This
// test exercises the route's own DB-backed `requireAdminUser` guard.
// ---------------------------------------------------------------------------

let mockUserId: string | undefined = 'user-001';

vi.mock('next/headers', async () => {
  const { sealAuthCookieValueSync } = await import('@/lib/auth-cookie-node');
  return {
    cookies: () => ({
      get: (name: string) =>
        name === 'pqm_user_id' && mockUserId ? { value: sealAuthCookieValueSync('pqm_user_id', mockUserId) } : undefined,
    }),
  };
});

beforeEach(() => {
  mockUserId = 'user-001';
  vi.resetModules();
});

afterEach(() => {
  vi.restoreAllMocks();
});

async function callGet(): Promise<Response> {
  const { GET } = await import('./route');
  return GET(new Request('http://localhost/api/audit-logs'));
}

describe('GET /api/audit-logs — admin gating', () => {
  it('returns the log for a System Admin', async () => {
    mockUserId = 'user-001';
    const response = await callGet();
    expect(response.status).toBe(200);
  });

  it('returns 403 FORBIDDEN for a non-admin role (Engineer)', async () => {
    mockUserId = 'user-003';
    const response = await callGet();
    expect(response.status).toBe(403);
    const body = (await response.json()) as { error?: { code?: string } };
    expect(body.error?.code).toBe('FORBIDDEN');
  });

  it('returns 401 UNAUTHORIZED when no cookie is set', async () => {
    mockUserId = undefined;
    const response = await callGet();
    expect(response.status).toBe(401);
    const body = (await response.json()) as { error?: { code?: string } };
    expect(body.error?.code).toBe('UNAUTHORIZED');
  });
});
