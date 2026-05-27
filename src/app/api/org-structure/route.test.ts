import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

// ---------------------------------------------------------------------------
// PR-07 smoke test for /api/org-structure
//
// Same shape as the /api/users persistence test: the route handlers must call
// persistProjectDemoState() after every successful mutation so that admin
// writes to the org tree survive a cold restart / blob re-hydration.
// ---------------------------------------------------------------------------

vi.mock('next/headers', () => ({
  cookies: () => ({
    get: (name: string) => (name === 'pqm_user_id' ? { value: 'user-001' } : undefined),
  }),
}));

interface GlobalState {
  __nsmProjectDemoStateHydrated: boolean | undefined;
  __nsmProjectDemoStateHydrationPromise: Promise<void> | undefined;
  __nsmProjectDemoStatePersistPromise: Promise<void> | undefined;
  __nsmUserStore: unknown;
  __nsmOrgStructureStore: unknown;
  __nsmAuditLogStore: unknown;
}

function resetGlobalDemoState() {
  const g = globalThis as unknown as GlobalState;
  g.__nsmProjectDemoStateHydrated = undefined;
  g.__nsmProjectDemoStateHydrationPromise = undefined;
  g.__nsmProjectDemoStatePersistPromise = undefined;
  g.__nsmUserStore = undefined;
  g.__nsmOrgStructureStore = undefined;
  g.__nsmAuditLogStore = undefined;
}

let tempDir: string;
let originalPersistFile: string | undefined;

beforeAll(async () => {
  tempDir = await mkdtemp(path.join(tmpdir(), 'pr07-org-route-'));
  originalPersistFile = process.env.PROJECT_DEMO_STATE_FILE;
  process.env.PROJECT_DEMO_STATE_FILE = path.join(tempDir, 'project-demo-state.json');
  delete process.env.BLOB_READ_WRITE_TOKEN;
});

afterAll(async () => {
  if (originalPersistFile === undefined) {
    delete process.env.PROJECT_DEMO_STATE_FILE;
  } else {
    process.env.PROJECT_DEMO_STATE_FILE = originalPersistFile;
  }
  await rm(tempDir, { recursive: true, force: true });
});

beforeEach(async () => {
  resetGlobalDemoState();
  vi.resetModules();
  await rm(path.join(tempDir, 'project-demo-state.json'), { force: true });
});

afterEach(() => {
  vi.restoreAllMocks();
});

// PR-17: the org-unit body now follows the `RidOrgUnit` discriminated union
// (PR-13 vocabulary). Persistence-test payload uses `kind: 'bureau'` to mimic
// the existing flat seed entries; `costCenter: null` matches the post-PR-17
// seed default (real codes pending RID-IT confirmation).
const NEW_ORG_UNIT_PAYLOAD = {
  kind: 'bureau' as const,
  name: 'หน่วยทดสอบความคงทน',
  nameEn: 'Persistence Test Unit',
  parentId: 'dept-root',
  costCenter: null,
};

describe('POST /api/org-structure persistence (PR-07)', () => {
  it('persists a newly created org unit so it survives a simulated cold restart', async () => {
    const { POST } = await import('./route');
    const { getOrgStructureStore } = await import('@/lib/org-structure-store');
    const { getAuditLogStore } = await import('@/lib/audit-log-store');

    const before = getOrgStructureStore().length;
    const beforeAuditCount = getAuditLogStore().length;

    const response = await POST(
      new Request('http://localhost/api/org-structure', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(NEW_ORG_UNIT_PAYLOAD),
      }),
    );
    expect(response.status).toBe(201);
    const body = (await response.json()) as { status: string; data: { id: string; name: string } };
    expect(body.status).toBe('success');
    expect(body.data.name).toBe(NEW_ORG_UNIT_PAYLOAD.name);

    expect(getOrgStructureStore().length).toBe(before + 1);
    // Audit log records the mutation as a structured AuditEvent (PR-05).
    expect(getAuditLogStore().length).toBe(beforeAuditCount + 1);
    const newEvent = getAuditLogStore().at(-1);
    expect(newEvent?.action).toBe('edit_org_structure');
    expect(newEvent?.resourceType).toBe('org_unit');
    expect(newEvent?.resourceId).toBe(body.data.id);

    const persistedRaw = await readFile(process.env.PROJECT_DEMO_STATE_FILE!, 'utf8');
    const persisted = JSON.parse(persistedRaw) as {
      orgStructure: Array<{ id: string; name: string }>;
    };
    expect(persisted.orgStructure.some((u) => u.id === body.data.id)).toBe(true);

    // Simulated cold restart.
    resetGlobalDemoState();
    vi.resetModules();
    const { ensureProjectDemoStateHydrated } = await import('@/lib/project-demo-state');
    const { getOrgStructureStore: getOrgStructureStoreAfter } = await import(
      '@/lib/org-structure-store'
    );
    await ensureProjectDemoStateHydrated();
    expect(getOrgStructureStoreAfter().some((u) => u.id === body.data.id)).toBe(true);
  });
});

describe('PATCH /api/org-structure persistence (PR-07)', () => {
  it('persists org unit updates across a simulated cold restart', async () => {
    const { POST, PATCH } = await import('./route');

    const createResponse = await POST(
      new Request('http://localhost/api/org-structure', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(NEW_ORG_UNIT_PAYLOAD),
      }),
    );
    const createdId = ((await createResponse.json()) as { data: { id: string } }).data.id;

    const patchResponse = await PATCH(
      new Request('http://localhost/api/org-structure', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          id: createdId,
          updates: { nameEn: 'Persistence Test Unit (Renamed)' },
        }),
      }),
    );
    expect(patchResponse.status).toBe(200);

    const persistedRaw = await readFile(process.env.PROJECT_DEMO_STATE_FILE!, 'utf8');
    const persisted = JSON.parse(persistedRaw) as {
      orgStructure: Array<{ id: string; nameEn: string }>;
    };
    expect(persisted.orgStructure.find((u) => u.id === createdId)?.nameEn).toBe(
      'Persistence Test Unit (Renamed)',
    );

    resetGlobalDemoState();
    vi.resetModules();
    const { ensureProjectDemoStateHydrated } = await import('@/lib/project-demo-state');
    const { getOrgStructureStore } = await import('@/lib/org-structure-store');
    await ensureProjectDemoStateHydrated();
    expect(getOrgStructureStore().find((u) => u.id === createdId)?.nameEn).toBe(
      'Persistence Test Unit (Renamed)',
    );
  });
});

describe('GET /api/org-structure (PR-17 asTree support)', () => {
  it('default GET returns the flat list (back-compat)', async () => {
    const { GET } = await import('./route');
    const response = await GET(new Request('http://localhost/api/org-structure'));
    expect(response.status).toBe(200);
    const body = (await response.json()) as {
      status: string;
      data: Array<{ id: string; kind: string; userCount: number }>;
    };
    expect(body.status).toBe('success');
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.data.length).toBeGreaterThan(0);
    // Every entry now carries the discriminator and the derived userCount.
    for (const unit of body.data) {
      expect(typeof unit.kind).toBe('string');
      expect(typeof unit.userCount).toBe('number');
    }
  });

  it('?asTree=true returns a nested tree rooted at the department', async () => {
    const { GET } = await import('./route');
    const response = await GET(
      new Request('http://localhost/api/org-structure?asTree=true'),
    );
    expect(response.status).toBe(200);
    const body = (await response.json()) as {
      status: string;
      data: {
        unit: { id: string; kind: string; userCount: number };
        children: Array<{ unit: { id: string }; children: unknown[] }>;
      } | null;
    };
    expect(body.status).toBe('success');
    expect(body.data).not.toBeNull();
    expect(body.data?.unit.id).toBe('dept-root');
    expect(body.data?.unit.kind).toBe('department');
    expect(Array.isArray(body.data?.children)).toBe(true);
    expect(body.data!.children.length).toBeGreaterThan(0);
    // A known seed grandchild lookup proves recursion.
    const dept001 = body.data!.children.find((node) => node.unit.id === 'dept-001');
    expect(dept001).toBeDefined();
    expect(dept001!.children.length).toBeGreaterThan(0);
  });
});

describe('DELETE /api/org-structure persistence (PR-07)', () => {
  it('persists org unit deletions across a simulated cold restart', async () => {
    const { POST, DELETE } = await import('./route');

    const createResponse = await POST(
      new Request('http://localhost/api/org-structure', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(NEW_ORG_UNIT_PAYLOAD),
      }),
    );
    const createdId = ((await createResponse.json()) as { data: { id: string } }).data.id;

    const deleteResponse = await DELETE(
      new Request('http://localhost/api/org-structure', {
        method: 'DELETE',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ id: createdId }),
      }),
    );
    expect(deleteResponse.status).toBe(200);

    const persistedRaw = await readFile(process.env.PROJECT_DEMO_STATE_FILE!, 'utf8');
    const persisted = JSON.parse(persistedRaw) as {
      orgStructure: Array<{ id: string }>;
    };
    expect(persisted.orgStructure.some((u) => u.id === createdId)).toBe(false);

    resetGlobalDemoState();
    vi.resetModules();
    const { ensureProjectDemoStateHydrated } = await import('@/lib/project-demo-state');
    const { getOrgStructureStore } = await import('@/lib/org-structure-store');
    await ensureProjectDemoStateHydrated();
    expect(getOrgStructureStore().some((u) => u.id === createdId)).toBe(false);
  });
});
