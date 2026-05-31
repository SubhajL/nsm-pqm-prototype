import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// ---------------------------------------------------------------------------
// PR-27 — Approval decision endpoint tests.
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

beforeEach(async () => {
  vi.resetModules();
  cookieCtx.userId = undefined;
});

afterEach(() => {
  vi.restoreAllMocks();
});

const PM_USER_ID = 'user-002';
const ADMIN_USER_ID = 'user-001';
const ENGINEER_USER_ID = 'user-003';
const PROJ_ID = 'proj-001';

async function createPar(): Promise<{ id: string }> {
  cookieCtx.userId = PM_USER_ID;
  const { POST } = await import('../../by-project/[projectId]/route');
  const res = await POST(
    new Request(`http://localhost/api/project-approval-requests/${PROJ_ID}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ notes: 'seed for decision test' }),
    }),
    { params: { projectId: PROJ_ID } },
  );
  expect(res.status).toBe(201);
  const body = (await res.json()) as { data: { id: string } };
  return body.data;
}

function decisionRequest(parId: string, body: unknown): Request {
  return new Request(
    `http://localhost/api/project-approval-requests/${parId}/decision`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    },
  );
}

describe('POST /api/project-approval-requests/[id]/decision', () => {
  it('404 for unknown PAR id', async () => {
    cookieCtx.userId = PM_USER_ID;
    const { POST } = await import('./route');
    const res = await POST(
      decisionRequest('par-does-not-exist', { decision: 'approve', comment: '' }),
      { params: { id: 'par-does-not-exist' } },
    );
    expect(res.status).toBe(404);
  });

  it('approve from submitted → pm_review for an authorised PM', async () => {
    const { id } = await createPar();
    const { POST } = await import('./route');
    const res = await POST(
      decisionRequest(id, { decision: 'approve', comment: 'looks good' }),
      { params: { id } },
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      data: {
        state: string;
        currentApproverRole: string;
        decisionHistory: { decision: string; comment: string }[];
      };
    };
    expect(body.data.state).toBe('pm_review');
    expect(body.data.currentApproverRole).toBe('pm');
    expect(body.data.decisionHistory).toHaveLength(1);
    expect(body.data.decisionHistory[0]?.decision).toBe('approve');
  });

  it('rejects an unauthorised actor (Engineer) with 403', async () => {
    const { id } = await createPar();
    cookieCtx.userId = ENGINEER_USER_ID;
    const { POST } = await import('./route');
    const res = await POST(
      decisionRequest(id, { decision: 'approve', comment: '' }),
      { params: { id } },
    );
    expect(res.status).toBe(403);
  });

  it('requires a comment when decision=reject (400 VALIDATION_FAILED)', async () => {
    const { id } = await createPar();
    const { POST } = await import('./route');
    const res = await POST(
      decisionRequest(id, { decision: 'reject', comment: '' }),
      { params: { id } },
    );
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: { code: string } };
    expect(body.error.code).toBe('VALIDATION_FAILED');
  });

  it('reject from any review state → state="rejected" + currentApproverRole=null', async () => {
    const { id } = await createPar();
    const { POST } = await import('./route');
    const res = await POST(
      decisionRequest(id, {
        decision: 'reject',
        comment: 'ขาดเอกสารแนบ',
      }),
      { params: { id } },
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      data: { state: string; currentApproverRole: string | null };
    };
    expect(body.data.state).toBe('rejected');
    expect(body.data.currentApproverRole).toBeNull();
  });

  it('request_changes leaves state unchanged but records the decision', async () => {
    const { id } = await createPar();
    const { POST } = await import('./route');
    const res = await POST(
      decisionRequest(id, {
        decision: 'request_changes',
        comment: 'กรุณาแก้ไขแผน',
      }),
      { params: { id } },
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      data: {
        state: string;
        decisionHistory: { decision: string }[];
      };
    };
    expect(body.data.state).toBe('submitted'); // unchanged
    expect(body.data.decisionHistory).toHaveLength(1);
    expect(body.data.decisionHistory[0]?.decision).toBe('request_changes');
  });

  it('full happy path: submitted → pm_review → bureau_review → committee_review → approved (admin)', async () => {
    const { id } = await createPar();
    const { POST } = await import('./route');

    // submitted → pm_review (PM)
    let res = await POST(
      decisionRequest(id, { decision: 'approve', comment: '' }),
      { params: { id } },
    );
    expect(res.status).toBe(200);

    // pm_review → bureau_review (PM)
    res = await POST(
      decisionRequest(id, { decision: 'approve', comment: '' }),
      { params: { id } },
    );
    expect(res.status).toBe(200);

    // bureau_review → committee_review (PM)
    res = await POST(
      decisionRequest(id, { decision: 'approve', comment: '' }),
      { params: { id } },
    );
    expect(res.status).toBe(200);

    // committee_review → approved (System Admin only per MVP table)
    cookieCtx.userId = ADMIN_USER_ID;
    res = await POST(
      decisionRequest(id, { decision: 'approve', comment: 'final approval' }),
      { params: { id } },
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      data: { state: string; decisionHistory: unknown[] };
    };
    expect(body.data.state).toBe('approved');
    expect(body.data.decisionHistory).toHaveLength(4);
  });
});
