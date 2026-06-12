import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// ---------------------------------------------------------------------------
// PR-27 — Project approval workflow per-project route tests.
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

beforeEach(async () => {
  vi.resetModules();
  cookieCtx.userId = undefined;
});

afterEach(() => {
  vi.restoreAllMocks();
});

const PM_USER_ID = 'user-002';
const TEAM_MEMBER_USER_ID = 'user-005';
const PROJ_ID = 'proj-001';

describe('GET /api/project-approval-requests/[projectId]', () => {
  it('returns an array for an authorised user', async () => {
    cookieCtx.userId = PM_USER_ID;
    const { GET } = await import('./route');
    const res = await GET(
      new Request(`http://localhost/api/project-approval-requests/${PROJ_ID}`),
      { params: { projectId: PROJ_ID } },
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as { status: string; data: unknown[] };
    expect(body.status).toBe('success');
    expect(Array.isArray(body.data)).toBe(true);
  });

  it('refuses an unauthenticated request', async () => {
    const { GET } = await import('./route');
    const res = await GET(
      new Request(`http://localhost/api/project-approval-requests/${PROJ_ID}`),
      { params: { projectId: PROJ_ID } },
    );
    expect([401, 403]).toContain(res.status);
  });
});

describe('POST /api/project-approval-requests/[projectId]', () => {
  it('creates a new approval request in state="submitted" for an authorised PM', async () => {
    cookieCtx.userId = PM_USER_ID;
    const { POST } = await import('./route');
    const res = await POST(
      new Request(`http://localhost/api/project-approval-requests/${PROJ_ID}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ notes: 'พร้อมขออนุมัติ' }),
      }),
      { params: { projectId: PROJ_ID } },
    );
    expect(res.status).toBe(201);
    const body = (await res.json()) as {
      status: string;
      data: { state: string; currentApproverRole: string; submittedBy: string };
    };
    expect(body.status).toBe('success');
    expect(body.data.state).toBe('submitted');
    expect(body.data.currentApproverRole).toBe('pm');
    expect(body.data.submittedBy).toBe(PM_USER_ID);
  });

  it('refuses an inactive or unauthorised user (suspended Team Member) with 403', async () => {
    cookieCtx.userId = TEAM_MEMBER_USER_ID;
    const { POST } = await import('./route');
    const res = await POST(
      new Request(`http://localhost/api/project-approval-requests/${PROJ_ID}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ notes: 'ขออนุมัติ' }),
      }),
      { params: { projectId: PROJ_ID } },
    );
    expect([401, 403]).toContain(res.status);
  });
});
