import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// ---------------------------------------------------------------------------
// PR-27 — Per-CR detail + PATCH (impact-analysis update) tests.
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

const PM_USER_ID = 'user-002';
const PROJ_ID = 'proj-001';

async function createSeedCr(): Promise<{ id: string }> {
  cookieCtx.userId = PM_USER_ID;
  const { POST } = await import('../route');
  const res = await POST(
    new Request('http://localhost/api/change-requests', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        projectId: PROJ_ID,
        title: 'patch-test CR',
        reason: 'unit-test seed',
        budgetImpact: 200_000,
        scheduleImpact: 3,
        linkedWbs: 'WBS 1.0',
        priority: 'low',
      }),
    }),
  );
  expect(res.status).toBe(201);
  const body = (await res.json()) as { data: { id: string } };
  return body.data;
}

describe('GET /api/change-requests/[id]', () => {
  it('404 for an unknown id', async () => {
    cookieCtx.userId = PM_USER_ID;
    const { GET } = await import('./route');
    const res = await GET(new Request('http://localhost/api/change-requests/missing'), {
      params: { id: 'missing' },
    });
    expect(res.status).toBe(404);
  });

  it('returns the CR for an authorised user', async () => {
    const { id } = await createSeedCr();
    const { GET } = await import('./route');
    const res = await GET(new Request(`http://localhost/api/change-requests/${id}`), {
      params: { id },
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: { id: string; status: string } };
    expect(body.data.id).toBe(id);
    expect(body.data.status).toBe('submitted');
  });
});

describe('PATCH /api/change-requests/[id]', () => {
  it('updates the impact-analysis fields and emits an audit event', async () => {
    const { id } = await createSeedCr();
    const { PATCH } = await import('./route');
    const res = await PATCH(
      new Request(`http://localhost/api/change-requests/${id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          impactScheduleDays: 21,
          impactBudgetTHB: 1_250_000,
          impactScope: 'เพิ่มจอ HMI 2 จอ + เปลี่ยนแบบฐานราก',
        }),
      }),
      { params: { id } },
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      data: { impactScheduleDays: number; impactBudgetTHB: number; impactScope: string };
    };
    expect(body.data.impactScheduleDays).toBe(21);
    expect(body.data.impactBudgetTHB).toBe(1_250_000);
    expect(body.data.impactScope).toContain('HMI');
  });

  it('rejects an empty patch body (400 VALIDATION_FAILED)', async () => {
    const { id } = await createSeedCr();
    const { PATCH } = await import('./route');
    const res = await PATCH(
      new Request(`http://localhost/api/change-requests/${id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({}),
      }),
      { params: { id } },
    );
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: { code: string } };
    expect(body.error.code).toBe('VALIDATION_FAILED');
  });

  it('accepts a partial patch (only impactScope)', async () => {
    const { id } = await createSeedCr();
    const { PATCH } = await import('./route');
    const res = await PATCH(
      new Request(`http://localhost/api/change-requests/${id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ impactScope: 'ปรับขอบเขตเล็กน้อย' }),
      }),
      { params: { id } },
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: { impactScope: string } };
    expect(body.data.impactScope).toBe('ปรับขอบเขตเล็กน้อย');
  });
});
