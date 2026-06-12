import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// ---------------------------------------------------------------------------
// PR-25 — Permit register API contract tests.
// Mirrors the lifecycle-route test pattern: cookie-driven auth, fresh DB
// per test via vi.resetModules, exercise the route against the real
// `getRepositories()` (which is pglite-backed when DATABASE_URL is unset).
// ---------------------------------------------------------------------------

interface CookieContext {
  userId: string | undefined;
}
const cookieCtx: CookieContext = { userId: undefined };

vi.mock('next/headers', async () => {
  const { sealAuthCookieValueSync } = await import('@/lib/auth-cookie-node');
  return {
    cookies: () => ({
      get: (name: string) =>
        name === 'pqm_user_id' && cookieCtx.userId
          ? { value: sealAuthCookieValueSync('pqm_user_id', cookieCtx.userId) }
          : undefined,
    }),
  };
});

interface GlobalState {
  __nsmProjectStore: unknown;
  __nsmAuditEventStore: unknown;
}

function resetGlobalStores() {
  const g = globalThis as unknown as GlobalState;
  g.__nsmProjectStore = undefined;
  g.__nsmAuditEventStore = undefined;
}

beforeEach(async () => {
  resetGlobalStores();
  vi.resetModules();
  cookieCtx.userId = undefined;
});

afterEach(() => {
  vi.restoreAllMocks();
});

const PM_USER_ID = 'user-002';
const PROJ_ID = 'proj-001';
const ENGINEER_USER_ID = 'user-003';

function makeGet(): Request {
  return new Request(`http://localhost/api/permits/${PROJ_ID}`, {
    method: 'GET',
  });
}

function makePost(body: unknown): Request {
  return new Request(`http://localhost/api/permits/${PROJ_ID}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('GET /api/permits/[projectId]', () => {
  it('returns an array (possibly empty) for an authorised user', async () => {
    cookieCtx.userId = PM_USER_ID;
    const { GET } = await import('./route');
    const res = await GET(makeGet(), { params: { projectId: PROJ_ID } });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { status: string; data: unknown[] };
    expect(body.status).toBe('success');
    expect(Array.isArray(body.data)).toBe(true);
  });

  it('returns 401/403 when the user is not authenticated', async () => {
    const { GET } = await import('./route');
    const res = await GET(makeGet(), { params: { projectId: PROJ_ID } });
    expect([401, 403]).toContain(res.status);
  });
});

describe('POST /api/permits/[projectId]', () => {
  it('returns 400 VALIDATION_FAILED for a malformed body', async () => {
    cookieCtx.userId = PM_USER_ID;
    const { POST } = await import('./route');
    const res = await POST(makePost({ foo: 'bar' }), {
      params: { projectId: PROJ_ID },
    });
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: { code: string } };
    expect(body.error.code).toBe('VALIDATION_FAILED');
  });

  it('creates a permit for an authorised PM and surfaces it in GET', async () => {
    cookieCtx.userId = PM_USER_ID;
    const { GET, POST } = await import('./route');

    const createRes = await POST(
      makePost({
        permitType: 'building',
        title: 'ใบอนุญาตก่อสร้าง (Building Permit)',
        issuingAuthority: 'อบต.ลำชี',
      }),
      { params: { projectId: PROJ_ID } },
    );
    expect(createRes.status).toBe(201);
    const created = (await createRes.json()) as {
      data: { id: string; status: string };
    };
    expect(created.data.status).toBe('draft');

    const listRes = await GET(makeGet(), { params: { projectId: PROJ_ID } });
    const list = (await listRes.json()) as { data: Array<{ id: string }> };
    expect(list.data.some((p) => p.id === created.data.id)).toBe(true);
  });

  it('returns 403 when the user lacks edit permission (engineer)', async () => {
    cookieCtx.userId = ENGINEER_USER_ID;
    const { POST } = await import('./route');
    const res = await POST(
      makePost({
        permitType: 'building',
        title: 'ใบอนุญาตก่อสร้าง',
        issuingAuthority: 'อบต.ลำชี',
      }),
      { params: { projectId: PROJ_ID } },
    );
    expect(res.status).toBe(403);
  });
});
