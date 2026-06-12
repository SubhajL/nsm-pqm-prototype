import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// ---------------------------------------------------------------------------
// PR-30a — Vendor SOW API contract tests.
// Mirrors the work-period route pattern: cookie-driven auth, fresh DB per
// test via vi.resetModules, exercise the real route + getRepositories().
// Verifies the IT-only gate returns 422 IT_ONLY_FEATURE on non-IT projects
// BEFORE any write lands.
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

const SYSADMIN_USER_ID = 'user-001';
// user-006 is the Project Manager for proj-002 (the IT seed project).
const PM_USER_ID = 'user-006';
const ENGINEER_USER_ID = 'user-003';
const IT_PROJ_ID = 'proj-002';
const NON_IT_PROJ_ID = 'proj-001';

const VALID_BODY = {
  phase: 'Phase 1 - SRS',
  scopeSummary: 'Software Requirements Specification deliverable.',
  uatCriteria: '- All functional requirements traced to test cases.',
  warrantyMonths: 12,
};

function makeGet(projectId: string): Request {
  return new Request(`http://localhost/api/vendor-sows/by-project/${projectId}`, {
    method: 'GET',
  });
}

function makePost(projectId: string, body: unknown): Request {
  return new Request(`http://localhost/api/vendor-sows/by-project/${projectId}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

const SLOW_DB_TIMEOUT = 15_000;

describe('GET /api/vendor-sows/by-project/[projectId]', () => {
  it(
    'returns 200 + array for an authorised user on an IT project',
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

  it(
    'returns 401/403 when not authenticated',
    async () => {
      const { GET } = await import('./route');
      const res = await GET(makeGet(IT_PROJ_ID), {
        params: { projectId: IT_PROJ_ID },
      });
      expect([401, 403]).toContain(res.status);
    },
    SLOW_DB_TIMEOUT,
  );
});

describe('POST /api/vendor-sows/by-project/[projectId]', () => {
  it(
    'returns 400 VALIDATION_FAILED on a malformed body',
    async () => {
      cookieCtx.userId = PM_USER_ID;
      const { POST } = await import('./route');
      const res = await POST(makePost(IT_PROJ_ID, { foo: 'bar' }), {
        params: { projectId: IT_PROJ_ID },
      });
      expect(res.status).toBe(400);
      const body = (await res.json()) as { error: { code: string } };
      expect(body.error.code).toBe('VALIDATION_FAILED');
    },
    SLOW_DB_TIMEOUT,
  );

  it(
    'creates a SOW for an authorised PM on the IT project and surfaces it in GET',
    async () => {
      cookieCtx.userId = PM_USER_ID;
      const { GET, POST } = await import('./route');

      const createRes = await POST(makePost(IT_PROJ_ID, VALID_BODY), {
        params: { projectId: IT_PROJ_ID },
      });
      expect(createRes.status).toBe(201);
      const created = (await createRes.json()) as {
        data: { id: string; state: string; phase: string };
      };
      expect(created.data.state).toBe('draft');
      expect(created.data.phase).toBe('Phase 1 - SRS');

      const listRes = await GET(makeGet(IT_PROJ_ID), {
        params: { projectId: IT_PROJ_ID },
      });
      const list = (await listRes.json()) as { data: Array<{ id: string }> };
      expect(list.data.some((s) => s.id === created.data.id)).toBe(true);
    },
    SLOW_DB_TIMEOUT,
  );

  it(
    'returns 422 IT_ONLY_FEATURE before writing on a non-IT project',
    async () => {
      // Sys admin has both visibility AND edit_basic on the non-IT project,
      // so the IT-only guard is the only gate that can fire — proving it
      // runs BEFORE the persistence write.
      cookieCtx.userId = SYSADMIN_USER_ID;
      const { POST } = await import('./route');
      const res = await POST(makePost(NON_IT_PROJ_ID, VALID_BODY), {
        params: { projectId: NON_IT_PROJ_ID },
      });
      expect(res.status).toBe(422);
      const body = (await res.json()) as { error: { code: string } };
      expect(body.error.code).toBe('IT_ONLY_FEATURE');
    },
    SLOW_DB_TIMEOUT,
  );

  it(
    'returns 403 when the user lacks edit permission (engineer)',
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
});
