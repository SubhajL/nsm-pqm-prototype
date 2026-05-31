import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

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
const PM_USER_ID = 'user-002';
const PROJ_ID = 'proj-001';

beforeEach(() => {
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

async function createWorkPeriod(): Promise<string> {
  cookieCtx.userId = PM_USER_ID;
  const { POST } = await import('../../work-periods/by-project/[projectId]/route');
  const req = new Request(`http://localhost/api/work-periods/${PROJ_ID}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      number: 1,
      title: 'งวดที่ 1',
      plannedStartDate: '2026-06-01',
      plannedEndDate: '2026-06-30',
      amount: 1_000_000,
      percentage: 10,
      deliverables: [],
    }),
  });
  const res = await POST(req, { params: { projectId: PROJ_ID } });
  expect(res.status).toBe(201);
  const body = (await res.json()) as { data: { id: string } };
  return body.data.id;
}

// First DB-bound call in each `it` pays the per-pglite migration + seed
// cost. Under parallel suite load on CPU-constrained hosts the default
// 5s budget can elapse before the seed lands, so opt into 20s for tests
// that traverse that path (createWorkPeriod + then a route call).
const SLOW_DB_TIMEOUT = 20_000;

describe('GET /api/delivery-slips/[workPeriodId]', () => {
  it('returns 503 when the flag is off', async () => {
    process.env[FLAG] = 'false';
    const { GET } = await import('./route');
    const res = await GET(new Request('http://localhost/'), {
      params: { workPeriodId: 'wp-x' },
    });
    expect(res.status).toBe(503);
  });

  it(
    'returns 404 when work period does not exist',
    async () => {
      cookieCtx.userId = PM_USER_ID;
      const { GET } = await import('./route');
      const res = await GET(new Request('http://localhost/'), {
        params: { workPeriodId: 'wp-missing' },
      });
      expect(res.status).toBe(404);
    },
    SLOW_DB_TIMEOUT,
  );

  it(
    'returns an array for an authorised user',
    async () => {
      const wpId = await createWorkPeriod();
      cookieCtx.userId = PM_USER_ID;
      const { GET } = await import('./route');
      const res = await GET(new Request('http://localhost/'), {
        params: { workPeriodId: wpId },
      });
      expect(res.status).toBe(200);
      const body = (await res.json()) as { data: unknown[] };
      expect(Array.isArray(body.data)).toBe(true);
    },
    SLOW_DB_TIMEOUT,
  );
});

describe('POST /api/delivery-slips/[workPeriodId]', () => {
  it(
    'returns 400 for malformed body',
    async () => {
      const wpId = await createWorkPeriod();
      cookieCtx.userId = PM_USER_ID;
      const { POST } = await import('./route');
      const res = await POST(
        new Request('http://localhost/', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ attachedDocIds: 'oops' }),
        }),
        { params: { workPeriodId: wpId } },
      );
      expect(res.status).toBe(400);
    },
    SLOW_DB_TIMEOUT,
  );

  it(
    'creates a delivery slip and surfaces it in GET',
    async () => {
      const wpId = await createWorkPeriod();
      cookieCtx.userId = PM_USER_ID;
      const { GET, POST } = await import('./route');

      const create = await POST(
        new Request('http://localhost/', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            attachedDocIds: ['doc-1', 'doc-2'],
            notes: 'ส่งมอบงวดที่ 1',
          }),
        }),
        { params: { workPeriodId: wpId } },
      );
      expect(create.status).toBe(201);
      const created = (await create.json()) as {
        data: { id: string; submittedBy: string; attachedDocIds: string[] };
      };
      expect(created.data.submittedBy).toBe(PM_USER_ID);
      expect(created.data.attachedDocIds).toEqual(['doc-1', 'doc-2']);

      const list = await GET(new Request('http://localhost/'), {
        params: { workPeriodId: wpId },
      });
      const body = (await list.json()) as { data: Array<{ id: string }> };
      expect(body.data.some((s) => s.id === created.data.id)).toBe(true);
    },
    SLOW_DB_TIMEOUT,
  );
});
