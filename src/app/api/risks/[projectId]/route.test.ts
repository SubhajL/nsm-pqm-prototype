import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('next/headers', () => ({
  cookies: () => ({
    get: (name: string) => (name === 'pqm_user_id' ? { value: 'user-001' } : undefined),
  }),
}));

interface GlobalState {
  __nsmRiskStore: unknown;
  __nsmIssueStore: unknown;
  __nsmAuditEventStore: unknown;
}

function resetGlobalStores() {
  const g = globalThis as unknown as GlobalState;
  g.__nsmRiskStore = undefined;
  g.__nsmIssueStore = undefined;
  g.__nsmAuditEventStore = undefined;
}

beforeEach(async () => {
  resetGlobalStores();
  vi.resetModules();
});

afterEach(() => {
  vi.restoreAllMocks();
});

const PROJECT_ID = 'proj-001';

async function getRisks() {
  const { GET } = await import('./route');
  const response = await GET(new Request(`http://localhost/api/risks/${PROJECT_ID}`), {
    params: { projectId: PROJECT_ID },
  });
  return (await response.json()) as {
    data: Array<{ id: string; level: string; score: number; likelihood: number; impact: number }>;
  };
}

async function patchRisk(body: unknown) {
  const { PATCH } = await import('./route');
  return PATCH(
    new Request(`http://localhost/api/risks/${PROJECT_ID}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    }),
    { params: { projectId: PROJECT_ID } },
  );
}

async function deleteRisk(body: unknown) {
  const { DELETE } = await import('./route');
  return DELETE(
    new Request(`http://localhost/api/risks/${PROJECT_ID}`, {
      method: 'DELETE',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    }),
    { params: { projectId: PROJECT_ID } },
  );
}

describe('PATCH /api/risks/[projectId] (PR-L)', () => {
  it('recomputes score + level when likelihood/impact change', async () => {
    const before = await getRisks();
    const target = before.data[0];
    expect(target).toBeTruthy();

    const response = await patchRisk({ id: target.id, likelihood: 5, impact: 4 });
    expect(response.status).toBe(200);
    const body = (await response.json()) as {
      data: { likelihood: number; impact: number; score: number; level: string };
    };
    expect(body.data.likelihood).toBe(5);
    expect(body.data.impact).toBe(4);
    expect(body.data.score).toBe(20);
    expect(body.data.level).toBe('critical'); // 20 >= 16
  });

  it('preserves existing score when only non-band fields are patched', async () => {
    const before = await getRisks();
    const target = before.data[0];
    const originalScore = target.score;
    const response = await patchRisk({ id: target.id, mitigation: 'updated plan' });
    expect(response.status).toBe(200);
    const body = (await response.json()) as { data: { score: number } };
    expect(body.data.score).toBe(originalScore);
  });

  it('returns 404 for an unknown risk id', async () => {
    const response = await patchRisk({ id: 'R-bogus-999', likelihood: 3 });
    expect(response.status).toBe(404);
  });

  it('rejects likelihood out of 1-5 with 400', async () => {
    const response = await patchRisk({ id: 'R-001', likelihood: 9 });
    expect(response.status).toBe(400);
  });
});

describe('DELETE /api/risks/[projectId] (PR-L)', () => {
  it('removes the risk and the listing no longer includes it', async () => {
    const before = await getRisks();
    const target = before.data[0];
    expect(target).toBeTruthy();

    const response = await deleteRisk({ id: target.id });
    expect(response.status).toBe(200);

    const after = await getRisks();
    expect(after.data.some((risk) => risk.id === target.id)).toBe(false);
  });

  it('returns 404 for unknown id', async () => {
    const response = await deleteRisk({ id: 'R-bogus-999' });
    expect(response.status).toBe(404);
  });
});
