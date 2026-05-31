import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// ---------------------------------------------------------------------------
// PR-24 — Procurement package transition route tests.
// Exercises the state-machine guard end-to-end through the API surface.
// ---------------------------------------------------------------------------

interface CookieContext {
  userId: string | undefined;
}
const cookieCtx: CookieContext = { userId: undefined };

vi.mock('next/headers', () => ({
  cookies: () => ({
    get: (name: string) =>
      name === 'pqm_user_id' && cookieCtx.userId
        ? { value: cookieCtx.userId }
        : undefined,
  }),
}));

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
const PROJ_ID = 'proj-001';

function makeTransition(packageId: string, to: string): Request {
  return new Request(
    `http://localhost/api/procurement-packages/${packageId}/transition`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ to }),
    },
  );
}

async function createPackage(): Promise<string> {
  const { POST } = await import(
    '@/app/api/procurement-packages/by-project/[projectId]/route'
  );
  const res = await POST(
    new Request(
      `http://localhost/api/procurement-packages/by-project/${PROJ_ID}`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          name: 'จัดซื้อจัดจ้าง',
          budgetCeiling: 1_000_000,
          procurementMethod: 'e_bidding',
        }),
      },
    ),
    { params: { projectId: PROJ_ID } },
  );
  const body = (await res.json()) as { data: { id: string } };
  return body.data.id;
}

describe('POST /api/procurement-packages/[packageId]/transition', () => {
  it('returns 404 NOT_FOUND for an unknown package', async () => {
    cookieCtx.userId = PM_USER_ID;
    const { POST } = await import('./route');
    const res = await POST(makeTransition('pkg-missing', 'tor_review'), {
      params: { packageId: 'pkg-missing' },
    });
    expect(res.status).toBe(404);
  });

  it('returns 422 INVALID_TRANSITION for an illegal edge', async () => {
    cookieCtx.userId = PM_USER_ID;
    const packageId = await createPackage();
    const { POST } = await import('./route');
    // draft -> awarded is not allowed.
    const res = await POST(makeTransition(packageId, 'awarded'), {
      params: { packageId },
    });
    expect(res.status).toBe(422);
    const body = (await res.json()) as { error: { code: string } };
    expect(body.error.code).toBe('INVALID_TRANSITION');
  });

  it('promotes draft -> tor_review for an authorised PM', async () => {
    cookieCtx.userId = PM_USER_ID;
    const packageId = await createPackage();
    const { POST } = await import('./route');
    const res = await POST(makeTransition(packageId, 'tor_review'), {
      params: { packageId },
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: { state: string } };
    expect(body.data.state).toBe('tor_review');
  });

  it('returns 400 VALIDATION_FAILED when `to` is missing', async () => {
    cookieCtx.userId = PM_USER_ID;
    const packageId = await createPackage();
    const { POST } = await import('./route');
    const res = await POST(
      new Request(
        `http://localhost/api/procurement-packages/${packageId}/transition`,
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({}),
        },
      ),
      { params: { packageId } },
    );
    expect(res.status).toBe(400);
  });
});
