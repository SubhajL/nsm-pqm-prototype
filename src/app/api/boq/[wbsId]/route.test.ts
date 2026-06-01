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

/** Find a (wbsId, itemId) on a non-outsourced project for write tests. */
async function discoverBoqContext(): Promise<{ wbsId: string; itemId: string }> {
  const { getRepositories } = await import('@/lib/repositories');
  const { isOutsourcedProject } = await import('@/types/project');
  const repos = getRepositories();
  const allWbs = await repos.wbs.list();
  for (const node of allWbs) {
    const project = await repos.projects.findById(node.projectId);
    if (!project || isOutsourcedProject(project)) continue;
    const items = await repos.boq.listByWbs(node.id);
    if (items.length > 0) {
      return { wbsId: node.id, itemId: items[0].id };
    }
  }
  throw new Error('No seeded BOQ items found on an internal project — fixture changed?');
}

async function patchBoq(wbsId: string, body: unknown) {
  const { PATCH } = await import('./route');
  return PATCH(
    new Request(`http://localhost/api/boq/${wbsId}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    }),
    { params: { wbsId } },
  );
}

async function deleteBoq(wbsId: string, body: unknown) {
  const { DELETE } = await import('./route');
  return DELETE(
    new Request(`http://localhost/api/boq/${wbsId}`, {
      method: 'DELETE',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    }),
    { params: { wbsId } },
  );
}

describe('PATCH /api/boq/[wbsId] (PR-C2)', () => {
  it('updates fields and the server recomputes total', async () => {
    const { wbsId, itemId } = await discoverBoqContext();
    const response = await patchBoq(wbsId, {
      id: itemId,
      description: 'Recompute test',
      quantity: 10,
      unitPrice: 50,
    });
    expect(response.status).toBe(200);
    const body = (await response.json()) as {
      data: { description: string; quantity: number; unitPrice: number; total: number };
    };
    expect(body.data.description).toBe('Recompute test');
    expect(body.data.total).toBe(500);
  });

  it('total derives from updated quantity+unitPrice (no client-supplied total)', async () => {
    const { wbsId, itemId } = await discoverBoqContext();
    const response = await patchBoq(wbsId, { id: itemId, quantity: 3, unitPrice: 100 });
    expect(response.status).toBe(200);
    const body = (await response.json()) as { data: { total: number } };
    expect(body.data.total).toBe(300);
  });

  it('returns 404 for unknown item id', async () => {
    const { wbsId } = await discoverBoqContext();
    const response = await patchBoq(wbsId, { id: 'boq-bogus-999', quantity: 1 });
    expect(response.status).toBe(404);
  });
});

describe('DELETE /api/boq/[wbsId] (PR-C2)', () => {
  it('removes the item and the listing no longer includes it', async () => {
    const { wbsId, itemId } = await discoverBoqContext();
    const response = await deleteBoq(wbsId, { id: itemId });
    expect(response.status).toBe(200);

    const { GET } = await import('./route');
    const after = (await (
      await GET(new Request(`http://localhost/api/boq/${wbsId}`), { params: { wbsId } })
    ).json()) as { data: Array<{ id: string }> };
    expect(after.data.some((item) => item.id === itemId)).toBe(false);
  });

  it('returns 404 for unknown id', async () => {
    const { wbsId } = await discoverBoqContext();
    const response = await deleteBoq(wbsId, { id: 'boq-bogus-999' });
    expect(response.status).toBe(404);
  });
});
