import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// ---------------------------------------------------------------------------
// PR-23 — Work Period (งวดงาน) API contract tests.
// Mirrors the permit-route pattern: cookie-driven auth, fresh DB per test
// via vi.resetModules, exercise the real route + getRepositories().
// FEATURE_RID_PAYMENT_FLOW is forced on per-test so the flag gate is
// transparent here; flag-disabled behaviour is asserted separately.
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

const FLAG = 'FEATURE_RID_PAYMENT_FLOW';
const ORIGINAL_FLAG = process.env[FLAG];

beforeEach(async () => {
  resetGlobalStores();
  vi.resetModules();
  cookieCtx.userId = undefined;
  process.env[FLAG] = 'true';
});

afterEach(() => {
  vi.restoreAllMocks();
  if (ORIGINAL_FLAG === undefined) {
    delete process.env[FLAG];
  } else {
    process.env[FLAG] = ORIGINAL_FLAG;
  }
});

const PM_USER_ID = 'user-002';
const PROJ_ID = 'proj-001';
const ENGINEER_USER_ID = 'user-003';

function makeGet(): Request {
  return new Request(`http://localhost/api/work-periods/${PROJ_ID}`, {
    method: 'GET',
  });
}

function makePost(body: unknown): Request {
  return new Request(`http://localhost/api/work-periods/${PROJ_ID}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

const VALID_CREATE_BODY = {
  number: 1,
  title: 'งวดที่ 1 — งานเตรียมพื้นที่',
  plannedStartDate: '2026-06-01',
  plannedEndDate: '2026-06-30',
  amount: 1_250_000,
  percentage: 10,
  deliverables: ['ส่งรายงานสำรวจ', 'ส่งแบบก่อสร้าง'],
};

// Each `it` triggers `vi.resetModules()` (above) → first DB call rebuilds
// the registry and runs `ensureDatabaseSeeded()` against a fresh pglite.
// Under heavy parallel suite load on this prototype the seed alone can
// exceed the vitest 5s default. Tests that traverse that path opt into a
// 15s budget explicitly. The flake otherwise manifests as intermittent
// "Test timed out in 5000ms" exits despite the route logic being correct.
const SLOW_DB_TIMEOUT = 15_000;

describe('GET /api/work-periods/by-project/[projectId]', () => {
  it(
    'returns an array (possibly empty) for an authorised user',
    async () => {
      cookieCtx.userId = PM_USER_ID;
      const { GET } = await import('./route');
      const res = await GET(makeGet(), { params: { projectId: PROJ_ID } });
      expect(res.status).toBe(200);
      const body = (await res.json()) as { status: string; data: unknown[] };
      expect(body.status).toBe('success');
      expect(Array.isArray(body.data)).toBe(true);
    },
    SLOW_DB_TIMEOUT,
  );

  it(
    'returns 401/403 when the user is not authenticated',
    async () => {
      const { GET } = await import('./route');
      const res = await GET(makeGet(), { params: { projectId: PROJ_ID } });
      expect([401, 403]).toContain(res.status);
    },
    SLOW_DB_TIMEOUT,
  );

  it('returns 503 FEATURE_DISABLED when the flag is off', async () => {
    // Flag-disabled responses don't hit the DB, so the default 5s budget
    // is fine here.
    process.env[FLAG] = 'false';
    cookieCtx.userId = PM_USER_ID;
    const { GET } = await import('./route');
    const res = await GET(makeGet(), { params: { projectId: PROJ_ID } });
    expect(res.status).toBe(503);
    const body = (await res.json()) as { error: { code: string } };
    expect(body.error.code).toBe('FEATURE_DISABLED');
  });
});

describe('POST /api/work-periods/by-project/[projectId]', () => {
  it(
    'returns 400 VALIDATION_FAILED for a malformed body',
    async () => {
      cookieCtx.userId = PM_USER_ID;
      const { POST } = await import('./route');
      const res = await POST(makePost({ foo: 'bar' }), {
        params: { projectId: PROJ_ID },
      });
      expect(res.status).toBe(400);
      const body = (await res.json()) as { error: { code: string } };
      expect(body.error.code).toBe('VALIDATION_FAILED');
    },
    SLOW_DB_TIMEOUT,
  );

  it(
    'creates a work period for an authorised PM and surfaces it in GET',
    async () => {
      cookieCtx.userId = PM_USER_ID;
      const { GET, POST } = await import('./route');

      const createRes = await POST(makePost(VALID_CREATE_BODY), {
        params: { projectId: PROJ_ID },
      });
      expect(createRes.status).toBe(201);
      const created = (await createRes.json()) as {
        data: { id: string; state: string; deliverables: string[] };
      };
      expect(created.data.state).toBe('planned');
      expect(created.data.deliverables).toEqual([
        'ส่งรายงานสำรวจ',
        'ส่งแบบก่อสร้าง',
      ]);

      const listRes = await GET(makeGet(), { params: { projectId: PROJ_ID } });
      const list = (await listRes.json()) as { data: Array<{ id: string }> };
      expect(list.data.some((wp) => wp.id === created.data.id)).toBe(true);
    },
    SLOW_DB_TIMEOUT,
  );

  it(
    'returns 403 when the user lacks edit permission (engineer)',
    async () => {
      cookieCtx.userId = ENGINEER_USER_ID;
      const { POST } = await import('./route');
      const res = await POST(makePost(VALID_CREATE_BODY), {
        params: { projectId: PROJ_ID },
      });
      expect(res.status).toBe(403);
    },
    SLOW_DB_TIMEOUT,
  );

  it('returns 503 FEATURE_DISABLED when the flag is off (BEFORE auth)', async () => {
    process.env[FLAG] = 'false';
    // No cookie — flag gate must fire first. No DB touched.
    const { POST } = await import('./route');
    const res = await POST(makePost(VALID_CREATE_BODY), {
      params: { projectId: PROJ_ID },
    });
    expect(res.status).toBe(503);
    const body = (await res.json()) as { error: { code: string } };
    expect(body.error.code).toBe('FEATURE_DISABLED');
  });
});
