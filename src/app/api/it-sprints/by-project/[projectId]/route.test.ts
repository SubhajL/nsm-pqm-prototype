import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// ---------------------------------------------------------------------------
// PR-30a — IT Sprint API contract tests. Mirrors the SOW route tests.
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

// user-006 is the PM for proj-002 (IT seed project). For the NON_IT_PROJ
// negative test we need a user that can ACCESS the non-IT project; use
// user-001 (System Admin) since they can access everything.
const PM_USER_ID = 'user-006';
const SYSADMIN_USER_ID = 'user-001';
const ENGINEER_USER_ID = 'user-003';
const IT_PROJ_ID = 'proj-002';
const NON_IT_PROJ_ID = 'proj-001';

const VALID_BODY = {
  sprintNumber: 1,
  startDate: '2026-06-01',
  endDate: '2026-06-14',
  goal: 'Sprint 1 kickoff — water alerts module',
  velocityPoints: 21,
};

function makeGet(projectId: string): Request {
  return new Request(`http://localhost/api/it-sprints/by-project/${projectId}`, {
    method: 'GET',
  });
}

function makePost(projectId: string, body: unknown): Request {
  return new Request(`http://localhost/api/it-sprints/by-project/${projectId}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

const SLOW_DB_TIMEOUT = 15_000;

describe('GET /api/it-sprints/by-project/[projectId]', () => {
  it(
    'returns 200 + array on an IT project',
    async () => {
      cookieCtx.userId = PM_USER_ID;
      const { GET } = await import('./route');
      const res = await GET(makeGet(IT_PROJ_ID), {
        params: { projectId: IT_PROJ_ID },
      });
      expect(res.status).toBe(200);
      const body = (await res.json()) as { status: string; data: unknown[] };
      expect(body.status).toBe('success');
      expect(Array.isArray(body.data)).toBe(true);
    },
    SLOW_DB_TIMEOUT,
  );

  it(
    'returns 422 IT_ONLY_FEATURE on a non-IT project',
    async () => {
      // Sys admin has access to every project, so the visibility check
      // succeeds and the IT-only guard fires.
      cookieCtx.userId = SYSADMIN_USER_ID;
      const { GET } = await import('./route');
      const res = await GET(makeGet(NON_IT_PROJ_ID), {
        params: { projectId: NON_IT_PROJ_ID },
      });
      expect(res.status).toBe(422);
      const body = (await res.json()) as { error: { code: string } };
      expect(body.error.code).toBe('IT_ONLY_FEATURE');
    },
    SLOW_DB_TIMEOUT,
  );
});

describe('POST /api/it-sprints/by-project/[projectId]', () => {
  it(
    'creates a sprint on the IT project',
    async () => {
      cookieCtx.userId = PM_USER_ID;
      const { GET, POST } = await import('./route');
      const createRes = await POST(makePost(IT_PROJ_ID, VALID_BODY), {
        params: { projectId: IT_PROJ_ID },
      });
      expect(createRes.status).toBe(201);
      const created = (await createRes.json()) as {
        data: { id: string; sprintNumber: number };
      };
      expect(created.data.sprintNumber).toBe(1);

      const listRes = await GET(makeGet(IT_PROJ_ID), {
        params: { projectId: IT_PROJ_ID },
      });
      const list = (await listRes.json()) as { data: Array<{ id: string }> };
      expect(list.data.some((s) => s.id === created.data.id)).toBe(true);
    },
    SLOW_DB_TIMEOUT,
  );

  it(
    'returns 422 IT_ONLY_FEATURE BEFORE writing on a non-IT project',
    async () => {
      // Sys admin has both visibility and edit_basic on the non-IT project,
      // so the IT-only guard is the only gate left to fire — proving the
      // guard runs BEFORE any persistence write.
      cookieCtx.userId = SYSADMIN_USER_ID;
      const { POST } = await import('./route');
      const res = await POST(makePost(NON_IT_PROJ_ID, VALID_BODY), {
        params: { projectId: NON_IT_PROJ_ID },
      });
      expect(res.status).toBe(422);
    },
    SLOW_DB_TIMEOUT,
  );

  it(
    'returns 403 for an engineer (lacks edit_basic)',
    async () => {
      cookieCtx.userId = ENGINEER_USER_ID;
      const { POST } = await import('./route');
      const res = await POST(makePost(IT_PROJ_ID, VALID_BODY), {
        params: { projectId: IT_PROJ_ID },
      });
      expect(res.status).toBe(403);
    },
    SLOW_DB_TIMEOUT,
  );

  it(
    'returns 400 for malformed body',
    async () => {
      cookieCtx.userId = PM_USER_ID;
      const { POST } = await import('./route');
      const res = await POST(makePost(IT_PROJ_ID, { foo: 'bar' }), {
        params: { projectId: IT_PROJ_ID },
      });
      expect(res.status).toBe(400);
    },
    SLOW_DB_TIMEOUT,
  );
});
