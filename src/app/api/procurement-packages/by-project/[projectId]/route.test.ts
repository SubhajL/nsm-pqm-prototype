import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// ---------------------------------------------------------------------------
// PR-24 — ProcurementPackage API contract tests.
// Mirrors the permits/[projectId]/route.test.ts pattern from PR-25.
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

// First-call DB bootstrap (migrations + seed) takes a few seconds on a
// fresh pglite — bump the default 5s timeout per file to absorb that.
vi.setConfig({ testTimeout: 15_000 });

const PM_USER_ID = 'user-002';
const ENGINEER_USER_ID = 'user-003';
const PROJ_ID = 'proj-001';

function makeGet(): Request {
  return new Request(`http://localhost/api/procurement-packages/by-project/${PROJ_ID}`, {
    method: 'GET',
  });
}

function makePost(body: unknown): Request {
  return new Request(`http://localhost/api/procurement-packages/by-project/${PROJ_ID}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('GET /api/procurement-packages/by-project/[projectId]', () => {
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

describe('POST /api/procurement-packages/by-project/[projectId]', () => {
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

  it('creates a package for an authorised PM and surfaces it in GET', async () => {
    cookieCtx.userId = PM_USER_ID;
    const { GET, POST } = await import('./route');

    const createRes = await POST(
      makePost({
        name: 'จัดซื้อจัดจ้างงานก่อสร้าง',
        budgetCeiling: 5_000_000,
        procurementMethod: 'e_bidding',
      }),
      { params: { projectId: PROJ_ID } },
    );
    expect(createRes.status).toBe(201);
    const created = (await createRes.json()) as {
      data: { id: string; state: string };
    };
    expect(created.data.state).toBe('draft');

    const listRes = await GET(makeGet(), { params: { projectId: PROJ_ID } });
    const list = (await listRes.json()) as { data: Array<{ id: string }> };
    expect(list.data.some((p) => p.id === created.data.id)).toBe(true);
  });

  it('returns 403 when the user lacks edit permission (engineer)', async () => {
    cookieCtx.userId = ENGINEER_USER_ID;
    const { POST } = await import('./route');
    const res = await POST(
      makePost({
        name: 'จัดซื้อจัดจ้าง',
        budgetCeiling: 1_000_000,
        procurementMethod: 'e_bidding',
      }),
      { params: { projectId: PROJ_ID } },
    );
    expect(res.status).toBe(403);
  });
});
