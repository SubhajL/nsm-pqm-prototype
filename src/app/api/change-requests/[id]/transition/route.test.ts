import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// ---------------------------------------------------------------------------
// PR-27 — Change-request state-transition API contract tests.
// Same harness as the permit/lifecycle tests: cookie-driven auth,
// fresh pglite per test, real `getRepositories()`.
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

// Reuses the seeded demo project + PM user — same fixtures other route
// tests depend on so we know they are auth-eligible.
const PM_USER_ID = 'user-002';
const ENGINEER_USER_ID = 'user-003';
const PROJ_ID = 'proj-001';

function makeTransitionRequest(crId: string, body: unknown): Request {
  return new Request(`http://localhost/api/change-requests/${crId}/transition`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

async function createSeedCr(): Promise<{ id: string }> {
  cookieCtx.userId = PM_USER_ID;
  const { POST } = await import('../../route');
  const res = await POST(
    new Request('http://localhost/api/change-requests', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        projectId: PROJ_ID,
        title: 'test CR',
        reason: 'unit-test seed',
        budgetImpact: 500_000,
        scheduleImpact: 5,
        linkedWbs: 'WBS 1.0',
        priority: 'medium',
      }),
    }),
  );
  expect(res.status).toBe(201);
  const body = (await res.json()) as { data: { id: string } };
  return body.data;
}

describe('POST /api/change-requests/[id]/transition', () => {
  it('refuses an unknown CR with 404', async () => {
    cookieCtx.userId = PM_USER_ID;
    const { POST } = await import('./route');
    const res = await POST(
      makeTransitionRequest('CR-DOES-NOT-EXIST', { toStatus: 'under_review' }),
      { params: { id: 'CR-DOES-NOT-EXIST' } },
    );
    expect(res.status).toBe(404);
  });

  it('advances submitted → under_review for an authorised PM', async () => {
    const { id } = await createSeedCr();
    const { POST } = await import('./route');
    const res = await POST(
      makeTransitionRequest(id, { toStatus: 'under_review' }),
      { params: { id } },
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      status: string;
      data: { status: string; approvedByChain: string[] };
      terminal: boolean;
    };
    expect(body.status).toBe('success');
    expect(body.data.status).toBe('under_review');
    // First forward transition appends the actor to the approval chain.
    expect(body.data.approvedByChain).toContain(PM_USER_ID);
    expect(body.terminal).toBe(false);
  });

  it('refuses an illegal transition with 403 + INVALID_TRANSITION', async () => {
    const { id } = await createSeedCr();
    const { POST } = await import('./route');
    // submitted → applied is not in the state machine.
    const res = await POST(
      makeTransitionRequest(id, { toStatus: 'applied' }),
      { params: { id } },
    );
    expect(res.status).toBe(403);
    const body = (await res.json()) as { error: { code: string; message: string } };
    expect(body.error.code).toBe('INVALID_TRANSITION');
    expect(body.error.message).toMatch(/state machine|not in/i);
  });

  it('refuses an unauthorised actor (Engineer) with 403', async () => {
    const { id } = await createSeedCr();
    cookieCtx.userId = ENGINEER_USER_ID;
    const { POST } = await import('./route');
    const res = await POST(
      makeTransitionRequest(id, { toStatus: 'under_review' }),
      { params: { id } },
    );
    expect(res.status).toBe(403);
  });

  it('requires a reason for rejection (400 VALIDATION_FAILED otherwise)', async () => {
    const { id } = await createSeedCr();
    const { POST } = await import('./route');
    const res = await POST(
      makeTransitionRequest(id, { toStatus: 'rejected' }),
      { params: { id } },
    );
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: { code: string } };
    expect(body.error.code).toBe('VALIDATION_FAILED');
  });

  it('records rejection with rejectedReason + decidedAt + terminal=true', async () => {
    const { id } = await createSeedCr();
    const { POST } = await import('./route');
    const res = await POST(
      makeTransitionRequest(id, {
        toStatus: 'rejected',
        reason: 'งบประมาณไม่เพียงพอ',
      }),
      { params: { id } },
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      data: { status: string; rejectedReason: string | null; decidedAt: string | null };
      terminal: boolean;
    };
    expect(body.data.status).toBe('rejected');
    expect(body.data.rejectedReason).toBe('งบประมาณไม่เพียงพอ');
    expect(body.data.decidedAt).toBeTruthy();
    expect(body.terminal).toBe(true);
  });
});
