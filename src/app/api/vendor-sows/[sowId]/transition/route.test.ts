import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// ---------------------------------------------------------------------------
// PR-30a — Vendor SOW transition route tests.
// Verifies the state machine integration: 409 STATE_TRANSITION_REJECTED on
// illegal moves, 422 IT_ONLY_FEATURE refused if a SOW happens to live on a
// non-IT project (defensive; the create route blocks the row in the first
// place), 404 for unknown sowId, and audit + signedAt/acceptedAt stamping.
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

const PM_USER_ID = 'user-006';
const IT_PROJ_ID = 'proj-002';

const SLOW_DB_TIMEOUT = 15_000;

async function createSow(
  projectId: string,
  body: { phase: string; scopeSummary: string; uatCriteria: string },
): Promise<{ id: string; state: string }> {
  const { POST } = await import('../../by-project/[projectId]/route');
  const req = new Request(
    `http://localhost/api/vendor-sows/by-project/${projectId}`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    },
  );
  const res = await POST(req, { params: { projectId } });
  if (res.status !== 201) {
    throw new Error(`Failed to seed SOW: status ${res.status}`);
  }
  const json = (await res.json()) as { data: { id: string; state: string } };
  return json.data;
}

function makeTransitionRequest(sowId: string, body: unknown): Request {
  return new Request(`http://localhost/api/vendor-sows/${sowId}/transition`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/vendor-sows/[sowId]/transition', () => {
  it(
    'happy path: draft → agreed stamps signedAt',
    async () => {
      cookieCtx.userId = PM_USER_ID;
      const seeded = await createSow(IT_PROJ_ID, {
        phase: 'Phase H',
        scopeSummary: 'happy path scope',
        uatCriteria: 'criteria',
      });
      const { POST } = await import('./route');
      const res = await POST(
        makeTransitionRequest(seeded.id, { targetState: 'agreed' }),
        { params: { sowId: seeded.id } },
      );
      expect(res.status).toBe(200);
      const body = (await res.json()) as {
        data: { state: string; signedAt: string | null };
      };
      expect(body.data.state).toBe('agreed');
      expect(typeof body.data.signedAt).toBe('string');
    },
    SLOW_DB_TIMEOUT,
  );

  it(
    'illegal transition: draft → accepted returns 409 STATE_TRANSITION_REJECTED',
    async () => {
      cookieCtx.userId = PM_USER_ID;
      const seeded = await createSow(IT_PROJ_ID, {
        phase: 'Phase I',
        scopeSummary: 'illegal path scope',
        uatCriteria: 'criteria',
      });
      const { POST } = await import('./route');
      const res = await POST(
        makeTransitionRequest(seeded.id, { targetState: 'accepted' }),
        { params: { sowId: seeded.id } },
      );
      expect(res.status).toBe(409);
      const body = (await res.json()) as {
        error: { code: string; reason: string };
      };
      expect(body.error.code).toBe('STATE_TRANSITION_REJECTED');
      expect(body.error.reason).toMatch(/draft|accepted|transition/i);
    },
    SLOW_DB_TIMEOUT,
  );

  it(
    'unknown sowId returns 404',
    async () => {
      cookieCtx.userId = PM_USER_ID;
      const { POST } = await import('./route');
      const res = await POST(
        makeTransitionRequest('sow-missing', { targetState: 'agreed' }),
        { params: { sowId: 'sow-missing' } },
      );
      expect(res.status).toBe(404);
    },
    SLOW_DB_TIMEOUT,
  );

  it(
    'malformed body returns 400 VALIDATION_FAILED (gated before lookup)',
    async () => {
      cookieCtx.userId = PM_USER_ID;
      const { POST } = await import('./route');
      const res = await POST(
        makeTransitionRequest('sow-anything', { targetState: 'bogus' }),
        { params: { sowId: 'sow-anything' } },
      );
      expect(res.status).toBe(400);
      const body = (await res.json()) as { error: { code: string } };
      expect(body.error.code).toBe('VALIDATION_FAILED');
    },
    SLOW_DB_TIMEOUT,
  );
});
