import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('next/headers', async () => {
  const { sealAuthCookieValueSync } = await import('@/lib/auth-cookie-node');
  return {
    cookies: () => ({
      get: (name: string) => (name === 'pqm_user_id' ? { value: sealAuthCookieValueSync('pqm_user_id', 'user-001') } : undefined),
    }),
  };
});

interface GlobalState {
  __nsmGanttStore: unknown;
  __nsmAuditEventStore: unknown;
}

function resetGlobalStores() {
  const g = globalThis as unknown as GlobalState;
  g.__nsmGanttStore = undefined;
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

async function postDep(body: unknown) {
  const { POST } = await import('./route');
  return POST(
    new Request(`http://localhost/api/gantt-dependencies/${PROJECT_ID}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    }),
    { params: { projectId: PROJECT_ID } },
  );
}

async function patchDep(body: unknown) {
  const { PATCH } = await import('./route');
  return PATCH(
    new Request(`http://localhost/api/gantt-dependencies/${PROJECT_ID}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    }),
    { params: { projectId: PROJECT_ID } },
  );
}

async function deleteDep(body: unknown) {
  const { DELETE } = await import('./route');
  return DELETE(
    new Request(`http://localhost/api/gantt-dependencies/${PROJECT_ID}`, {
      method: 'DELETE',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    }),
    { params: { projectId: PROJECT_ID } },
  );
}

async function getTaskIds(): Promise<{ first: number; second: number }> {
  const { getRepositories } = await import('@/lib/repositories');
  const store = await getRepositories().gantt.getProjectData(PROJECT_ID);
  // Filter out 'project' summary rows — predecessors must be tasks.
  const real = store.data.filter((task) => task.type !== 'project');
  if (real.length < 2) {
    throw new Error('Fixture has fewer than 2 real tasks — test setup invalid');
  }
  return { first: real[0].id, second: real[1].id };
}

describe('POST /api/gantt-dependencies/[projectId] (PR-3.5)', () => {
  it('creates a new FS dependency by default and returns 201', async () => {
    const { first, second } = await getTaskIds();
    const response = await postDep({ predecessorId: first, successorId: second });
    expect(response.status).toBe(201);
    const body = (await response.json()) as {
      data: { source: number; target: number; type: string; lagDays: number };
    };
    expect(body.data.source).toBe(first);
    expect(body.data.target).toBe(second);
    expect(body.data.type).toBe('FS');
    expect(body.data.lagDays).toBe(0);
  });

  it('rejects self-edges with 400', async () => {
    const { first } = await getTaskIds();
    const response = await postDep({ predecessorId: first, successorId: first });
    expect(response.status).toBe(400);
  });

  it('rejects unknown predecessor with 404', async () => {
    const { first } = await getTaskIds();
    const response = await postDep({ predecessorId: 999_999, successorId: first });
    expect(response.status).toBe(404);
  });

  it('rejects a cycle-closing edge with 409 DEPENDENCY_CYCLE', async () => {
    const { first, second } = await getTaskIds();
    // Create A → B; then try B → A.
    const created = await postDep({ predecessorId: first, successorId: second });
    expect(created.status).toBe(201);
    const cyclic = await postDep({ predecessorId: second, successorId: first });
    expect(cyclic.status).toBe(409);
    const body = (await cyclic.json()) as { error?: { code?: string } };
    expect(body.error?.code).toBe('DEPENDENCY_CYCLE');
  });
});

describe('PATCH + DELETE /api/gantt-dependencies/[projectId] (PR-3.5)', () => {
  it('PATCH updates type + lagDays and returns 200', async () => {
    const { first, second } = await getTaskIds();
    const created = await postDep({ predecessorId: first, successorId: second });
    const { data } = (await created.json()) as { data: { id: number } };

    const response = await patchDep({ id: data.id, type: 'SS', lagDays: 3 });
    expect(response.status).toBe(200);
    const body = (await response.json()) as {
      data: { type: string; lagDays: number };
    };
    expect(body.data.type).toBe('SS');
    expect(body.data.lagDays).toBe(3);
  });

  it('PATCH returns 404 for unknown id', async () => {
    const response = await patchDep({ id: 999_999, type: 'SS' });
    expect(response.status).toBe(404);
  });

  it('DELETE removes the link and returns it', async () => {
    const { first, second } = await getTaskIds();
    const created = await postDep({ predecessorId: first, successorId: second });
    const { data } = (await created.json()) as { data: { id: number } };

    const response = await deleteDep({ id: data.id });
    expect(response.status).toBe(200);

    // Re-verify via the gantt GET — the link should be gone.
    const { GET } = await import('@/app/api/gantt/[projectId]/route');
    const getResponse = await GET(
      new Request(`http://localhost/api/gantt/${PROJECT_ID}`),
      { params: { projectId: PROJECT_ID } },
    );
    const body = (await getResponse.json()) as {
      data: { links: Array<{ id: number }> };
    };
    expect(body.data.links.some((link) => link.id === data.id)).toBe(false);
  });

  it('DELETE returns 404 for unknown id', async () => {
    const response = await deleteDep({ id: 999_999 });
    expect(response.status).toBe(404);
  });
});
