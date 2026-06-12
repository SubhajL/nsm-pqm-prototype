import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// ---------------------------------------------------------------------------
// PR-PRQM-K — Inspection [id] PATCH route tests.
//
// New PATCH endpoint dedicated to editing the inspection metadata
// (overallResult / failReason / workflowStatus / checklist). The
// existing collection-level PATCH at `/api/quality/inspections` covers
// the checklist-item-resolve + workflow status transitions used by the
// existing UI; this route is the simpler "edit modal" surface.
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
const EXEC_USER_ID = 'user-007';
const INSP_ID = 'insp-001'; // from src/data/inspections.json
const SLOW_DB_TIMEOUT = 30_000;

function patchRequest(id: string, body: unknown): Request {
  return new Request(`http://localhost/api/quality/inspections/${id}`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('PATCH /api/quality/inspections/[id]', () => {
  it('returns 400 VALIDATION_FAILED for malformed body (empty object)', async () => {
    cookieCtx.userId = PM_USER_ID;
    const { PATCH } = await import('./route');
    const res = await PATCH(patchRequest(INSP_ID, {}), {
      params: { id: INSP_ID },
    });
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: { code: string } };
    expect(body.error.code).toBe('VALIDATION_FAILED');
  });

  it('returns 400 for unknown field (strict schema)', async () => {
    cookieCtx.userId = PM_USER_ID;
    const { PATCH } = await import('./route');
    const res = await PATCH(
      patchRequest(INSP_ID, { somethingElse: 'nope' }),
      { params: { id: INSP_ID } },
    );
    expect(res.status).toBe(400);
  });

  it('returns 404 for an unknown inspection id', async () => {
    cookieCtx.userId = PM_USER_ID;
    const { PATCH } = await import('./route');
    const res = await PATCH(
      patchRequest('insp-missing', { failReason: 'updated reason' }),
      { params: { id: 'insp-missing' } },
    );
    expect(res.status).toBe(404);
  });

  it('returns 403 for users without edit_quality_inspection (Executive)', async () => {
    cookieCtx.userId = EXEC_USER_ID;
    const { PATCH } = await import('./route');
    const res = await PATCH(
      patchRequest(INSP_ID, { failReason: 'updated' }),
      { params: { id: INSP_ID } },
    );
    expect(res.status).toBe(403);
  });

  it('updates failReason (happy path)', async () => {
    cookieCtx.userId = PM_USER_ID;
    const { PATCH } = await import('./route');
    const res = await PATCH(
      patchRequest(INSP_ID, { failReason: 'ปรับปรุงคำอธิบายใหม่' }),
      { params: { id: INSP_ID } },
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      data: { id: string; failReason: string };
    };
    expect(body.data.id).toBe(INSP_ID);
    expect(body.data.failReason).toBe('ปรับปรุงคำอธิบายใหม่');
  });

  it(
    'updates overallResult + failReason together',
    async () => {
      cookieCtx.userId = PM_USER_ID;
      const { PATCH } = await import('./route');
      const res = await PATCH(
        patchRequest(INSP_ID, {
          overallResult: 'pass',
          failReason: '',
        }),
        { params: { id: INSP_ID } },
      );
      expect(res.status).toBe(200);
      const body = (await res.json()) as {
        data: { overallResult: string; failReason: string };
      };
      expect(body.data.overallResult).toBe('pass');
      expect(body.data.failReason).toBe('');
    },
    SLOW_DB_TIMEOUT,
  );

  it('blocks workflowStatus draft → confirmed when fails remain', async () => {
    cookieCtx.userId = PM_USER_ID;
    // insp-001 has a failing checklist item (cl-4) in the seed. Attempting
    // to advance to confirmed without resolving fails is blocked.
    const { PATCH } = await import('./route');
    const res = await PATCH(
      patchRequest(INSP_ID, { workflowStatus: 'confirmed' }),
      { params: { id: INSP_ID } },
    );
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: { code: string; message: string } };
    expect(body.error.code).toBe('BAD_REQUEST');
    expect(body.error.message).toMatch(/ไม่ผ่าน/);
  });

  it('rejects illegal workflow transition draft → signed (skipping confirmed)', async () => {
    cookieCtx.userId = PM_USER_ID;
    const { PATCH } = await import('./route');
    const res = await PATCH(
      patchRequest(INSP_ID, {
        // Pass an all-pass checklist so the fail-check does not catch it
        // first — the state machine should reject the skip.
        checklist: [
          {
            id: 'cl-x',
            item: 'placeholder',
            criteria: 'placeholder',
            result: 'pass',
            note: '',
          },
        ],
        workflowStatus: 'signed',
      }),
      { params: { id: INSP_ID } },
    );
    expect(res.status).toBe(409);
    const body = (await res.json()) as { error: { code: string } };
    expect(body.error.code).toBe('INVALID_TRANSITION');
  });
});
