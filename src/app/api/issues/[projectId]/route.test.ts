import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('next/headers', () => ({
  cookies: () => ({
    get: (name: string) => (name === 'pqm_user_id' ? { value: 'user-001' } : undefined),
  }),
}));

interface GlobalState {
  __nsmIssueStore: unknown;
  __nsmAuditEventStore: unknown;
}

function resetGlobalStores() {
  const g = globalThis as unknown as GlobalState;
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

async function getIssues() {
  const { GET } = await import('./route');
  const response = await GET(new Request(`http://localhost/api/issues/${PROJECT_ID}`), {
    params: { projectId: PROJECT_ID },
  });
  return (await response.json()) as {
    data: Array<{ id: string; title: string; severity: string; status: string }>;
  };
}

async function patchIssue(body: unknown) {
  const { PATCH } = await import('./route');
  return PATCH(
    new Request(`http://localhost/api/issues/${PROJECT_ID}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    }),
    { params: { projectId: PROJECT_ID } },
  );
}

async function deleteIssue(body: unknown) {
  const { DELETE } = await import('./route');
  return DELETE(
    new Request(`http://localhost/api/issues/${PROJECT_ID}`, {
      method: 'DELETE',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    }),
    { params: { projectId: PROJECT_ID } },
  );
}

describe('PATCH /api/issues/[projectId] (PR-L)', () => {
  it('legacy status-only PATCH still works (back-compat)', async () => {
    const before = await getIssues();
    const target = before.data.find((i) => i.status !== 'closed');
    expect(target).toBeTruthy();
    if (!target) return;

    const response = await patchIssue({ issueId: target.id, status: 'closed' });
    expect(response.status).toBe(200);
    const body = (await response.json()) as { data: { status: string } };
    expect(body.data.status).toBe('closed');
  });

  it('full-edit PATCH updates title + severity + assignee', async () => {
    const before = await getIssues();
    const target = before.data[0];

    const response = await patchIssue({
      id: target.id,
      title: 'Renamed title',
      severity: 'high',
      assignee: 'someone-new',
    });
    expect(response.status).toBe(200);
    const body = (await response.json()) as {
      data: { title: string; severity: string; assignee: string };
    };
    expect(body.data.title).toBe('Renamed title');
    expect(body.data.severity).toBe('high');
    expect(body.data.assignee).toBe('someone-new');
  });

  it('returns 404 for unknown id in full-edit branch', async () => {
    const response = await patchIssue({ id: 'ISS-bogus-999', title: 'X' });
    expect(response.status).toBe(404);
  });
});

describe('DELETE /api/issues/[projectId] (PR-L)', () => {
  it('removes the issue and the listing no longer includes it', async () => {
    const before = await getIssues();
    const target = before.data[0];

    const response = await deleteIssue({ id: target.id });
    expect(response.status).toBe(200);

    const after = await getIssues();
    expect(after.data.some((issue) => issue.id === target.id)).toBe(false);
  });

  it('returns 404 for unknown id', async () => {
    const response = await deleteIssue({ id: 'ISS-bogus-999' });
    expect(response.status).toBe(404);
  });
});
