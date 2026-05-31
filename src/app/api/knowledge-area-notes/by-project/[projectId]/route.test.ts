import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// ---------------------------------------------------------------------------
// PR-30a — Knowledge area notes API contract tests.
// Verifies the version-monotonic write (every POST yields v = previous+1) and
// the 422 IT_ONLY_FEATURE gate.
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

// user-006 is the PM for proj-002 (IT seed project).
// user-001 is System Admin (access to everything) — used for the NON_IT
// 422 negative test where we need both visibility + edit_basic so the
// IT-only guard is the only gate left to fire.
const PM_USER_ID = 'user-006';
const SYSADMIN_USER_ID = 'user-001';
const IT_PROJ_ID = 'proj-002';
const NON_IT_PROJ_ID = 'proj-001';

const SLOW_DB_TIMEOUT = 15_000;

function makeGet(projectId: string, area?: string): Request {
  const url = area
    ? `http://localhost/api/knowledge-area-notes/by-project/${projectId}?area=${area}`
    : `http://localhost/api/knowledge-area-notes/by-project/${projectId}`;
  return new Request(url, { method: 'GET' });
}

function makePost(projectId: string, body: unknown): Request {
  return new Request(
    `http://localhost/api/knowledge-area-notes/by-project/${projectId}`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    },
  );
}

describe('GET /api/knowledge-area-notes/by-project/[projectId]', () => {
  it(
    'returns 200 + array on an IT project',
    async () => {
      cookieCtx.userId = PM_USER_ID;
      const { GET } = await import('./route');
      const res = await GET(makeGet(IT_PROJ_ID), {
        params: { projectId: IT_PROJ_ID },
      });
      expect(res.status).toBe(200);
      const body = (await res.json()) as { data: unknown[] };
      expect(Array.isArray(body.data)).toBe(true);
    },
    SLOW_DB_TIMEOUT,
  );

  it(
    'returns 422 IT_ONLY_FEATURE on a non-IT project',
    async () => {
      cookieCtx.userId = SYSADMIN_USER_ID;
      const { GET } = await import('./route');
      const res = await GET(makeGet(NON_IT_PROJ_ID), {
        params: { projectId: NON_IT_PROJ_ID },
      });
      expect(res.status).toBe(422);
    },
    SLOW_DB_TIMEOUT,
  );

  it(
    'rejects an unknown ?area=… with 400 VALIDATION_FAILED',
    async () => {
      cookieCtx.userId = PM_USER_ID;
      const { GET } = await import('./route');
      const res = await GET(makeGet(IT_PROJ_ID, 'scope_management'), {
        params: { projectId: IT_PROJ_ID },
      });
      expect(res.status).toBe(400);
    },
    SLOW_DB_TIMEOUT,
  );
});

describe('POST /api/knowledge-area-notes/by-project/[projectId]', () => {
  it(
    'first write yields version 1; second write yields version 2 (monotonic per area)',
    async () => {
      cookieCtx.userId = PM_USER_ID;
      const { GET, POST } = await import('./route');

      const r1 = await POST(
        makePost(IT_PROJ_ID, { area: 'integration', content: 'v1 draft' }),
        { params: { projectId: IT_PROJ_ID } },
      );
      expect(r1.status).toBe(201);
      const v1 = (await r1.json()) as { data: { version: number } };
      expect(v1.data.version).toBe(1);

      const r2 = await POST(
        makePost(IT_PROJ_ID, { area: 'integration', content: 'v2 revised' }),
        { params: { projectId: IT_PROJ_ID } },
      );
      expect(r2.status).toBe(201);
      const v2 = (await r2.json()) as { data: { version: number } };
      expect(v2.data.version).toBe(2);

      // Different area should start at v1 again.
      const r3 = await POST(
        makePost(IT_PROJ_ID, {
          area: 'communication_plan',
          content: 'comm plan v1',
        }),
        { params: { projectId: IT_PROJ_ID } },
      );
      const v3 = (await r3.json()) as { data: { version: number; area: string } };
      expect(v3.data.version).toBe(1);
      expect(v3.data.area).toBe('communication_plan');

      // GET filtered by area returns the matching history.
      const listRes = await GET(makeGet(IT_PROJ_ID, 'integration'), {
        params: { projectId: IT_PROJ_ID },
      });
      const list = (await listRes.json()) as {
        data: Array<{ area: string; version: number }>;
      };
      expect(list.data.every((n) => n.area === 'integration')).toBe(true);
      expect(list.data.some((n) => n.version === 1)).toBe(true);
      expect(list.data.some((n) => n.version === 2)).toBe(true);
    },
    SLOW_DB_TIMEOUT,
  );

  it(
    'returns 422 IT_ONLY_FEATURE before writing on a non-IT project',
    async () => {
      cookieCtx.userId = SYSADMIN_USER_ID;
      const { POST } = await import('./route');
      const res = await POST(
        makePost(NON_IT_PROJ_ID, { area: 'integration', content: 'x' }),
        { params: { projectId: NON_IT_PROJ_ID } },
      );
      expect(res.status).toBe(422);
    },
    SLOW_DB_TIMEOUT,
  );

  it(
    'rejects unknown DT6 area with 400',
    async () => {
      cookieCtx.userId = PM_USER_ID;
      const { POST } = await import('./route');
      const res = await POST(
        makePost(IT_PROJ_ID, { area: 'scope_management', content: 'x' }),
        { params: { projectId: IT_PROJ_ID } },
      );
      expect(res.status).toBe(400);
    },
    SLOW_DB_TIMEOUT,
  );
});
