import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// ---------------------------------------------------------------------------
// PR-30a — IT Sprint PATCH route tests.
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

const PM_USER_ID = 'user-006';
const IT_PROJ_ID = 'proj-002';

const SLOW_DB_TIMEOUT = 15_000;

async function createSprint(projectId: string): Promise<{ id: string }> {
  const { POST } = await import('../by-project/[projectId]/route');
  const req = new Request(
    `http://localhost/api/it-sprints/by-project/${projectId}`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        sprintNumber: 99,
        startDate: '2026-06-01',
        endDate: '2026-06-14',
        goal: 'seeded sprint',
        velocityPoints: 13,
      }),
    },
  );
  const res = await POST(req, { params: { projectId } });
  if (res.status !== 201) throw new Error(`seed failed: ${res.status}`);
  const json = (await res.json()) as { data: { id: string } };
  return json.data;
}

function makePatch(sprintId: string, body: unknown): Request {
  return new Request(`http://localhost/api/it-sprints/${sprintId}`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('PATCH /api/it-sprints/[sprintId]', () => {
  it(
    'updates completedPoints + notes',
    async () => {
      cookieCtx.userId = PM_USER_ID;
      const seeded = await createSprint(IT_PROJ_ID);
      const { PATCH } = await import('./route');
      const res = await PATCH(
        makePatch(seeded.id, { completedPoints: 11, notes: 'partial delivery' }),
        { params: { sprintId: seeded.id } },
      );
      expect(res.status).toBe(200);
      const body = (await res.json()) as {
        data: { completedPoints: number; notes: string };
      };
      expect(body.data.completedPoints).toBe(11);
      expect(body.data.notes).toBe('partial delivery');
    },
    SLOW_DB_TIMEOUT,
  );

  it(
    'rejects an empty body (refine guard)',
    async () => {
      cookieCtx.userId = PM_USER_ID;
      const seeded = await createSprint(IT_PROJ_ID);
      const { PATCH } = await import('./route');
      const res = await PATCH(makePatch(seeded.id, {}), {
        params: { sprintId: seeded.id },
      });
      expect(res.status).toBe(400);
    },
    SLOW_DB_TIMEOUT,
  );

  it(
    'returns 404 for unknown sprintId',
    async () => {
      cookieCtx.userId = PM_USER_ID;
      const { PATCH } = await import('./route');
      const res = await PATCH(makePatch('sp-missing', { completedPoints: 1 }), {
        params: { sprintId: 'sp-missing' },
      });
      expect(res.status).toBe(404);
    },
    SLOW_DB_TIMEOUT,
  );
});
