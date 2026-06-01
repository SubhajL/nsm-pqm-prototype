import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// ---------------------------------------------------------------------------
// PR-PRQM-K — Quality gate transition route tests.
//
// The transition route consults the pure state machine in
// `src/lib/rid/quality-gate-state-machine.ts`:
//   - pending → conditional | passed
//   - conditional → passed
//   - passed (terminal)
//
// Covers:
//   - 400 for malformed body
//   - 404 for unknown gate id (or gate id from a different project)
//   - 403 for users without edit_quality_inspection (Executive)
//   - 409 INVALID_TRANSITION for illegal edges (passed → pending,
//     conditional → pending)
//   - 200 happy paths (pending → passed AND pending → conditional)
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
const EXEC_USER_ID = 'user-007';
const PROJ_ID = 'proj-001';

// Fixture-derived: gate-5 is `pending`, gate-4 is `conditional`,
// gate-0 is `passed`. See `src/data/quality-gates.json`.
const PENDING_GATE_ID = 'gate-5';
const CONDITIONAL_GATE_ID = 'gate-4';
const PASSED_GATE_ID = 'gate-0';

function transitionRequest(projectId: string, body: unknown): Request {
  return new Request(
    `http://localhost/api/quality/gates/${projectId}/transition`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    },
  );
}

describe('POST /api/quality/gates/[projectId]/transition', () => {
  it('returns 400 VALIDATION_FAILED for malformed body', async () => {
    cookieCtx.userId = PM_USER_ID;
    const { POST } = await import('./route');
    const res = await POST(transitionRequest(PROJ_ID, { foo: 'bar' }), {
      params: { projectId: PROJ_ID },
    });
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: { code: string } };
    expect(body.error.code).toBe('VALIDATION_FAILED');
  });

  it('returns 400 for invalid toState value', async () => {
    cookieCtx.userId = PM_USER_ID;
    const { POST } = await import('./route');
    const res = await POST(
      transitionRequest(PROJ_ID, { gateId: PENDING_GATE_ID, toState: 'invalid' }),
      { params: { projectId: PROJ_ID } },
    );
    expect(res.status).toBe(400);
  });

  it('returns 404 for an unknown gate id', async () => {
    cookieCtx.userId = PM_USER_ID;
    const { POST } = await import('./route');
    const res = await POST(
      transitionRequest(PROJ_ID, { gateId: 'gate-missing', toState: 'passed' }),
      { params: { projectId: PROJ_ID } },
    );
    expect(res.status).toBe(404);
    const body = (await res.json()) as { error: { code: string } };
    expect(body.error.code).toBe('NOT_FOUND');
  });

  it('returns 403 for users without edit_quality_inspection (Executive)', async () => {
    cookieCtx.userId = EXEC_USER_ID;
    const { POST } = await import('./route');
    const res = await POST(
      transitionRequest(PROJ_ID, { gateId: PENDING_GATE_ID, toState: 'passed' }),
      { params: { projectId: PROJ_ID } },
    );
    expect(res.status).toBe(403);
  });

  it('returns 409 INVALID_TRANSITION for passed → pending (terminal edge)', async () => {
    cookieCtx.userId = PM_USER_ID;
    const { POST } = await import('./route');
    const res = await POST(
      transitionRequest(PROJ_ID, { gateId: PASSED_GATE_ID, toState: 'pending' }),
      { params: { projectId: PROJ_ID } },
    );
    expect(res.status).toBe(409);
    const body = (await res.json()) as { error: { code: string; message: string } };
    expect(body.error.code).toBe('INVALID_TRANSITION');
    expect(body.error.message).toMatch(/passed|terminal/i);
  });

  it('returns 409 INVALID_TRANSITION for conditional → pending (backward edge)', async () => {
    cookieCtx.userId = PM_USER_ID;
    const { POST } = await import('./route');
    const res = await POST(
      transitionRequest(PROJ_ID, { gateId: CONDITIONAL_GATE_ID, toState: 'pending' }),
      { params: { projectId: PROJ_ID } },
    );
    expect(res.status).toBe(409);
    const body = (await res.json()) as { error: { code: string } };
    expect(body.error.code).toBe('INVALID_TRANSITION');
  });

  it('transitions pending → passed (happy path)', async () => {
    cookieCtx.userId = PM_USER_ID;
    const { POST } = await import('./route');
    const res = await POST(
      transitionRequest(PROJ_ID, { gateId: PENDING_GATE_ID, toState: 'passed' }),
      { params: { projectId: PROJ_ID } },
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      data: { id: string; status: string; projectId: string };
    };
    expect(body.data.id).toBe(PENDING_GATE_ID);
    expect(body.data.status).toBe('passed');
    expect(body.data.projectId).toBe(PROJ_ID);
  });

  it('transitions pending → conditional (happy path)', async () => {
    cookieCtx.userId = PM_USER_ID;
    const { POST } = await import('./route');
    // gate-6 is also pending in the fixture — use it so this test does not
    // conflict with the previous one when run in the same process.
    const res = await POST(
      transitionRequest(PROJ_ID, { gateId: 'gate-6', toState: 'conditional' }),
      { params: { projectId: PROJ_ID } },
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: { status: string } };
    expect(body.data.status).toBe('conditional');
  });
});
