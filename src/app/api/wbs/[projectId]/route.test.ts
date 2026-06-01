import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('next/headers', () => ({
  cookies: () => ({
    get: (name: string) => (name === 'pqm_user_id' ? { value: 'user-001' } : undefined),
  }),
}));

interface GlobalState {
  __nsmWbsStore: unknown;
  __nsmBoqStore: unknown;
  __nsmAuditEventStore: unknown;
}

function resetGlobalStores() {
  const g = globalThis as unknown as GlobalState;
  g.__nsmWbsStore = undefined;
  g.__nsmBoqStore = undefined;
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

async function getRoot() {
  const { GET } = await import('./route');
  const response = await GET(new Request(`http://localhost/api/wbs/${PROJECT_ID}`), {
    params: { projectId: PROJECT_ID },
  });
  return (await response.json()) as { data: Array<{ id: string; parentId: string | null }> };
}

async function patchWbs(body: unknown) {
  const { PATCH } = await import('./route');
  return PATCH(
    new Request(`http://localhost/api/wbs/${PROJECT_ID}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    }),
    { params: { projectId: PROJECT_ID } },
  );
}

async function deleteWbs(body: unknown) {
  const { DELETE } = await import('./route');
  return DELETE(
    new Request(`http://localhost/api/wbs/${PROJECT_ID}`, {
      method: 'DELETE',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    }),
    { params: { projectId: PROJECT_ID } },
  );
}

describe('PATCH /api/wbs/[projectId] (PR-C2)', () => {
  it('updates name + weight + progress and returns 200', async () => {
    const before = await getRoot();
    const target = before.data.find((node) => node.parentId !== null)?.id;
    expect(target).toBeTruthy();

    const response = await patchWbs({
      id: target,
      name: 'Renamed (Updated)',
      weight: 25,
      progress: 50,
    });
    expect(response.status).toBe(200);
    const body = (await response.json()) as {
      data: { name: string; weight: number; progress: number };
    };
    expect(body.data.name).toBe('Renamed (Updated)');
    expect(body.data.weight).toBe(25);
    expect(body.data.progress).toBe(50);
  });

  it('returns 404 for an unknown node id', async () => {
    const response = await patchWbs({ id: 'wbs-bogus-999', name: 'X' });
    expect(response.status).toBe(404);
  });

  it('rejects negative weight with 400', async () => {
    const response = await patchWbs({ id: 'wbs-anything', weight: -5 });
    expect(response.status).toBe(400);
  });
});

describe('DELETE /api/wbs/[projectId] (PR-C2)', () => {
  it('deletes a leaf node and removes it from the listing', async () => {
    const before = await getRoot();
    const target = before.data[before.data.length - 1]?.id;
    expect(target).toBeTruthy();

    const response = await deleteWbs({ id: target });
    expect(response.status).toBe(200);

    const after = await getRoot();
    expect(after.data.some((node) => node.id === target)).toBe(false);
  });

  it('cascades to descendants when deleting an inner node', async () => {
    const before = await getRoot();
    const parent = before.data.find((node) =>
      before.data.some((other) => other.parentId === node.id),
    );
    expect(parent).toBeTruthy();
    if (!parent) return;
    const childrenBefore = before.data
      .filter((n) => n.parentId === parent.id)
      .map((n) => n.id);

    const response = await deleteWbs({ id: parent.id });
    expect(response.status).toBe(200);

    const after = await getRoot();
    expect(after.data.some((n) => n.id === parent.id)).toBe(false);
    for (const childId of childrenBefore) {
      expect(after.data.some((n) => n.id === childId)).toBe(false);
    }
  });

  it('returns 404 for an unknown node id', async () => {
    const response = await deleteWbs({ id: 'wbs-bogus-999' });
    expect(response.status).toBe(404);
  });
});
