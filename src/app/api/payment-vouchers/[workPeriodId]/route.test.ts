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

// See work-periods route test for rationale.
const SLOW_DB_TIMEOUT = 20_000;

describe('GET /api/payment-vouchers/[workPeriodId]', () => {
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
    'returns empty array initially',
    async () => {
      const wpId = await createWorkPeriod();
      cookieCtx.userId = PM_USER_ID;
      const { GET } = await import('./route');
      const res = await GET(new Request('http://localhost/'), {
        params: { workPeriodId: wpId },
      });
      expect(res.status).toBe(200);
      const body = (await res.json()) as { data: unknown[] };
      expect(body.data).toEqual([]);
    },
    SLOW_DB_TIMEOUT,
  );
});

describe('POST /api/payment-vouchers/[workPeriodId]', () => {
  it(
    'returns 400 when requestedAmount is missing or non-positive',
    async () => {
      const wpId = await createWorkPeriod();
      cookieCtx.userId = PM_USER_ID;
      const { POST } = await import('./route');
      const res = await POST(
        new Request('http://localhost/', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ requestedAmount: 0 }),
        }),
        { params: { workPeriodId: wpId } },
      );
      expect(res.status).toBe(400);
    },
    SLOW_DB_TIMEOUT,
  );

  it(
    'creates a draft voucher',
    async () => {
      const wpId = await createWorkPeriod();
      cookieCtx.userId = PM_USER_ID;
      const { POST } = await import('./route');
      const res = await POST(
        new Request('http://localhost/', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ requestedAmount: 1_000_000 }),
        }),
        { params: { workPeriodId: wpId } },
      );
      expect(res.status).toBe(201);
      const body = (await res.json()) as {
        data: { id: string; state: string; requestedAmount: number };
      };
      expect(body.data.state).toBe('draft');
      expect(body.data.requestedAmount).toBe(1_000_000);
    },
    SLOW_DB_TIMEOUT,
  );
});

describe('PATCH /api/payment-vouchers/[workPeriodId]', () => {
  it(
    'returns 404 when no voucher exists for the workPeriod',
    async () => {
      const wpId = await createWorkPeriod();
      cookieCtx.userId = PM_USER_ID;
      const { PATCH } = await import('./route');
      const res = await PATCH(
        new Request('http://localhost/', {
          method: 'PATCH',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ state: 'submitted' }),
        }),
        { params: { workPeriodId: wpId } },
      );
      expect(res.status).toBe(404);
    },
    SLOW_DB_TIMEOUT,
  );

  it(
    'updates state from draft → submitted',
    async () => {
      const wpId = await createWorkPeriod();
      cookieCtx.userId = PM_USER_ID;
      const { POST, PATCH } = await import('./route');
      await POST(
        new Request('http://localhost/', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ requestedAmount: 1_000_000 }),
        }),
        { params: { workPeriodId: wpId } },
      );

      const res = await PATCH(
        new Request('http://localhost/', {
          method: 'PATCH',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ state: 'submitted' }),
        }),
        { params: { workPeriodId: wpId } },
      );
      expect(res.status).toBe(200);
      const body = (await res.json()) as { data: { state: string } };
      expect(body.data.state).toBe('submitted');
    },
    SLOW_DB_TIMEOUT,
  );

  it(
    'honours voucherNumber only on approved transition',
    async () => {
      const wpId = await createWorkPeriod();
      cookieCtx.userId = PM_USER_ID;
      const { POST, PATCH } = await import('./route');
      await POST(
        new Request('http://localhost/', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ requestedAmount: 1_000_000 }),
        }),
        { params: { workPeriodId: wpId } },
      );
      await PATCH(
        new Request('http://localhost/', {
          method: 'PATCH',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ state: 'submitted' }),
        }),
        { params: { workPeriodId: wpId } },
      );
      const res = await PATCH(
        new Request('http://localhost/', {
          method: 'PATCH',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            state: 'approved',
            approvedAmount: 950_000,
            voucherNumber: 'V-2026-001',
          }),
        }),
        { params: { workPeriodId: wpId } },
      );
      expect(res.status).toBe(200);
      const body = (await res.json()) as {
        data: { state: string; voucherNumber: string; approvedAmount: number };
      };
      expect(body.data.state).toBe('approved');
      expect(body.data.voucherNumber).toBe('V-2026-001');
      expect(body.data.approvedAmount).toBe(950_000);
    },
    SLOW_DB_TIMEOUT,
  );
});
