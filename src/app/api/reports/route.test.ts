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

const PM_USER_ID = 'user-002';
const FOREIGN_PM_USER_ID = 'user-006';
const PROJ_ID = 'proj-001';

beforeEach(async () => {
  resetGlobalStores();
  vi.resetModules();
  cookieCtx.userId = undefined;
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('GET /api/reports', () => {
  it('returns 401 when no user is authenticated', async () => {
    const { GET } = await import('./route');
    const res = await GET(
      new Request(
        `http://localhost/api/reports?projectId=${PROJ_ID}&kind=monthly&periodStart=2026-05-01&periodEnd=2026-05-31`,
      ),
    );
    expect(res.status).toBe(401);
  });

  it('returns 400 when projectId is missing', async () => {
    cookieCtx.userId = PM_USER_ID;
    const { GET } = await import('./route');
    const res = await GET(
      new Request('http://localhost/api/reports?kind=monthly'),
    );
    expect(res.status).toBe(400);
  });

  it('returns 400 when kind is invalid', async () => {
    cookieCtx.userId = PM_USER_ID;
    const { GET } = await import('./route');
    const res = await GET(
      new Request(
        `http://localhost/api/reports?projectId=${PROJ_ID}&kind=bogus`,
      ),
    );
    expect(res.status).toBe(400);
  });

  it('returns 400 when monthly report omits period dates', async () => {
    cookieCtx.userId = PM_USER_ID;
    const { GET } = await import('./route');
    const res = await GET(
      new Request(
        `http://localhost/api/reports?projectId=${PROJ_ID}&kind=monthly`,
      ),
    );
    expect(res.status).toBe(400);
  });

  it('returns 200 + monthly RidReportData for the assigned PM', async () => {
    cookieCtx.userId = PM_USER_ID;
    const { GET } = await import('./route');
    const res = await GET(
      new Request(
        `http://localhost/api/reports?projectId=${PROJ_ID}&kind=monthly&periodStart=2026-05-01&periodEnd=2026-05-31`,
      ),
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      data: { kind: string; projectId: string; sections: unknown[] };
    };
    expect(body.data.kind).toBe('monthly');
    expect(body.data.projectId).toBe(PROJ_ID);
    expect(Array.isArray(body.data.sections)).toBe(true);
    expect(body.data.sections.length).toBeGreaterThan(0);
  });

  it('returns 403 when caller cannot see the project', async () => {
    cookieCtx.userId = FOREIGN_PM_USER_ID;
    const { GET } = await import('./route');
    const res = await GET(
      new Request(
        `http://localhost/api/reports?projectId=${PROJ_ID}&kind=monthly&periodStart=2026-05-01&periodEnd=2026-05-31`,
      ),
    );
    expect(res.status).toBe(403);
  });

  it('returns 200 + delay RidReportData with null period window', async () => {
    cookieCtx.userId = PM_USER_ID;
    const { GET } = await import('./route');
    const res = await GET(
      new Request(
        `http://localhost/api/reports?projectId=${PROJ_ID}&kind=delay&evaluationDate=2026-05-15`,
      ),
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      data: { kind: string; periodStart: null; periodEnd: null };
    };
    expect(body.data.kind).toBe('delay');
    expect(body.data.periodStart).toBeNull();
    expect(body.data.periodEnd).toBeNull();
  });

  it('returns 400 when work_period report omits workPeriodId', async () => {
    cookieCtx.userId = PM_USER_ID;
    const { GET } = await import('./route');
    const res = await GET(
      new Request(
        `http://localhost/api/reports?projectId=${PROJ_ID}&kind=work_period`,
      ),
    );
    expect(res.status).toBe(400);
  });

  it('returns 404 when the work period does not exist for the project', async () => {
    cookieCtx.userId = PM_USER_ID;
    const { GET } = await import('./route');
    const res = await GET(
      new Request(
        `http://localhost/api/reports?projectId=${PROJ_ID}&kind=work_period&workPeriodId=wp-does-not-exist`,
      ),
    );
    expect(res.status).toBe(404);
  });

  it('signatory block always contains exactly three rows', async () => {
    cookieCtx.userId = PM_USER_ID;
    const { GET } = await import('./route');
    const res = await GET(
      new Request(
        `http://localhost/api/reports?projectId=${PROJ_ID}&kind=monthly&periodStart=2026-05-01&periodEnd=2026-05-31`,
      ),
    );
    const body = (await res.json()) as {
      data: { signatories: { role: string }[] };
    };
    expect(body.data.signatories).toHaveLength(3);
    expect(body.data.signatories[0].role).toContain('Project Manager');
    expect(body.data.signatories[2].role).toContain('Witness');
  });
});
