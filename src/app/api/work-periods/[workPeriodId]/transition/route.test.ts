import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// ---------------------------------------------------------------------------
// PR-23 — Work Period transition route.
//
// The route consults the pure state machine and the parent project's
// deliveryMethod. Tests exercise: (1) flag gate, (2) validation,
// (3) authz, (4) happy-path transition, (5) state-machine rejection,
// (6) 404 for unknown id.
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

const FLAG = 'FEATURE_RID_PAYMENT_FLOW';
const ORIGINAL_FLAG = process.env[FLAG];
const PM_USER_ID = 'user-002';
const PROJ_ID = 'proj-001';
const ENGINEER_USER_ID = 'user-003';

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

function makeRequest(body: unknown, workPeriodId: string): Request {
  return new Request(
    `http://localhost/api/work-periods/${workPeriodId}/transition`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    },
  );
}

async function createWorkPeriod(): Promise<string> {
  cookieCtx.userId = PM_USER_ID;
  const { POST } = await import('../../by-project/[projectId]/route');
  const req = new Request(`http://localhost/api/work-periods/by-project/${PROJ_ID}`, {
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

// See work-periods/[projectId]/route.test.ts for the rationale; the
// transition route's tests cross the seed boundary twice (createWorkPeriod
// + transition call), so the 15s allowance is even more important here.
const SLOW_DB_TIMEOUT = 20_000;

describe('POST /api/work-periods/[workPeriodId]/transition', () => {
  it('returns 503 FEATURE_DISABLED when the flag is off', async () => {
    process.env[FLAG] = 'false';
    const { POST } = await import('./route');
    const res = await POST(makeRequest({ targetState: 'in_progress' }, 'wp-x'), {
      params: { workPeriodId: 'wp-x' },
    });
    expect(res.status).toBe(503);
  });

  it(
    'returns 400 VALIDATION_FAILED for an invalid body',
    async () => {
      cookieCtx.userId = PM_USER_ID;
      const { POST } = await import('./route');
      const res = await POST(makeRequest({ foo: 'bar' }, 'wp-x'), {
        params: { workPeriodId: 'wp-x' },
      });
      expect(res.status).toBe(400);
    },
    SLOW_DB_TIMEOUT,
  );

  it(
    'returns 404 when the work period does not exist',
    async () => {
      cookieCtx.userId = PM_USER_ID;
      const { POST } = await import('./route');
      const res = await POST(
        makeRequest({ targetState: 'in_progress' }, 'wp-missing'),
        { params: { workPeriodId: 'wp-missing' } },
      );
      expect(res.status).toBe(404);
    },
    SLOW_DB_TIMEOUT,
  );

  it(
    'returns 403 when the user lacks edit permission (engineer)',
    async () => {
      const wpId = await createWorkPeriod();
      cookieCtx.userId = ENGINEER_USER_ID;
      const { POST } = await import('./route');
      const res = await POST(
        makeRequest({ targetState: 'in_progress' }, wpId),
        { params: { workPeriodId: wpId } },
      );
      expect(res.status).toBe(403);
    },
    SLOW_DB_TIMEOUT,
  );

  it(
    'transitions planned → in_progress for an authorised PM',
    async () => {
      const wpId = await createWorkPeriod();
      cookieCtx.userId = PM_USER_ID;
      const { POST } = await import('./route');
      const res = await POST(
        makeRequest({ targetState: 'in_progress' }, wpId),
        { params: { workPeriodId: wpId } },
      );
      expect(res.status).toBe(200);
      const body = (await res.json()) as { data: { state: string } };
      expect(body.data.state).toBe('in_progress');
    },
    SLOW_DB_TIMEOUT,
  );

  it(
    'returns 409 STATE_TRANSITION_REJECTED for an illegal transition',
    async () => {
      const wpId = await createWorkPeriod();
      cookieCtx.userId = PM_USER_ID;
      const { POST } = await import('./route');
      // planned → payment_requested is illegal regardless of delivery method.
      const res = await POST(
        makeRequest({ targetState: 'payment_requested' }, wpId),
        { params: { workPeriodId: wpId } },
      );
      expect(res.status).toBe(409);
      const body = (await res.json()) as {
        error: { code: string; reason?: string };
      };
      expect(body.error.code).toBe('STATE_TRANSITION_REJECTED');
      expect(body.error.reason).toBeTruthy();
    },
    SLOW_DB_TIMEOUT,
  );

  it(
    'returns 409 EVIDENCE_REQUIRED when transitioning to submitted without a delivery slip (PR-23 follow-up)',
    async () => {
      const wpId = await createWorkPeriod();
      cookieCtx.userId = PM_USER_ID;
      const { POST } = await import('./route');

      // First, move planned → in_progress (no evidence required).
      const stepOne = await POST(
        makeRequest({ targetState: 'in_progress' }, wpId),
        { params: { workPeriodId: wpId } },
      );
      expect(stepOne.status).toBe(200);

      // Now try in_progress → submitted without a delivery slip on file.
      // The senior g-check flagged this previously-permitted move as a HIGH
      // bug; the route now rejects it with 409 EVIDENCE_REQUIRED.
      const stepTwo = await POST(
        makeRequest({ targetState: 'submitted' }, wpId),
        { params: { workPeriodId: wpId } },
      );
      expect(stepTwo.status).toBe(409);
      const body = (await stepTwo.json()) as {
        error: { code: string; requiredEvidence?: string };
      };
      expect(body.error.code).toBe('EVIDENCE_REQUIRED');
      expect(body.error.requiredEvidence).toBe('delivery_slip');
    },
    SLOW_DB_TIMEOUT,
  );
});
