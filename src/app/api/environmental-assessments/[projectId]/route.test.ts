import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

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

interface GlobalState {
  __nsmProjectStore: unknown;
  __nsmAuditEventStore: unknown;
}

function resetGlobalStores() {
  const g = globalThis as unknown as GlobalState;
  g.__nsmProjectStore = undefined;
  g.__nsmAuditEventStore = undefined;
}

beforeEach(async () => {
  resetGlobalStores();
  vi.resetModules();
  cookieCtx.userId = undefined;
});

afterEach(() => {
  vi.restoreAllMocks();
});

const PM_USER_ID = 'user-002';
const PROJ_ID = 'proj-001';

describe('environmental-assessments route', () => {
  it('GET returns success array for an authorised user', async () => {
    cookieCtx.userId = PM_USER_ID;
    const { GET } = await import('./route');
    const res = await GET(
      new Request(`http://localhost/api/environmental-assessments/${PROJ_ID}`),
      { params: { projectId: PROJ_ID } },
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: unknown[] };
    expect(Array.isArray(body.data)).toBe(true);
  });

  it('POST creates an EIA row and POST→GET round-trips', async () => {
    cookieCtx.userId = PM_USER_ID;
    const { GET, POST } = await import('./route');
    const created = await POST(
      new Request(`http://localhost/api/environmental-assessments/${PROJ_ID}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          kind: 'EIA',
          status: 'in_progress',
          notes: 'รอผลพิจารณา',
        }),
      }),
      { params: { projectId: PROJ_ID } },
    );
    expect(created.status).toBe(201);
    const createdBody = (await created.json()) as {
      data: { id: string; kind: string; status: string };
    };
    expect(createdBody.data.kind).toBe('EIA');
    expect(createdBody.data.status).toBe('in_progress');

    const listed = await GET(
      new Request(`http://localhost/api/environmental-assessments/${PROJ_ID}`),
      { params: { projectId: PROJ_ID } },
    );
    const listBody = (await listed.json()) as {
      data: Array<{ id: string }>;
    };
    expect(listBody.data.some((e) => e.id === createdBody.data.id)).toBe(true);
  });

  it('POST returns 400 on invalid body', async () => {
    cookieCtx.userId = PM_USER_ID;
    const { POST } = await import('./route');
    const res = await POST(
      new Request(`http://localhost/api/environmental-assessments/${PROJ_ID}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ kind: 'bogus' }),
      }),
      { params: { projectId: PROJ_ID } },
    );
    expect(res.status).toBe(400);
  });
});
