import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

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

describe('land-acquisition route', () => {
  it('GET returns success array', async () => {
    cookieCtx.userId = PM_USER_ID;
    const { GET } = await import('./route');
    const res = await GET(
      new Request(`http://localhost/api/land-acquisition/${PROJ_ID}`),
      { params: { projectId: PROJ_ID } },
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: unknown[] };
    expect(Array.isArray(body.data)).toBe(true);
  });

  it('POST creates a parcel record and POST→GET round-trips', async () => {
    cookieCtx.userId = PM_USER_ID;
    const { GET, POST } = await import('./route');
    const created = await POST(
      new Request(`http://localhost/api/land-acquisition/${PROJ_ID}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          parcelReference: 'โฉนดเลขที่ 9999',
          landownerName: 'นางสาวพิมพ์ ใจดี',
          areaRai: 2.25,
          status: 'identified',
        }),
      }),
      { params: { projectId: PROJ_ID } },
    );
    expect(created.status).toBe(201);
    const createdBody = (await created.json()) as {
      data: { id: string; status: string; compensationAmount: number | null };
    };
    expect(createdBody.data.status).toBe('identified');
    expect(createdBody.data.compensationAmount).toBeNull();

    const listed = await GET(
      new Request(`http://localhost/api/land-acquisition/${PROJ_ID}`),
      { params: { projectId: PROJ_ID } },
    );
    const listBody = (await listed.json()) as { data: Array<{ id: string }> };
    expect(listBody.data.some((l) => l.id === createdBody.data.id)).toBe(true);
  });
});
