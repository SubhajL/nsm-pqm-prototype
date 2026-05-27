import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

// ---------------------------------------------------------------------------
// PR-07 smoke test
//
// Confirms that POST /api/users + PATCH /api/users:
//   1. mutate the in-memory user store
//   2. call persistProjectDemoState() — the bug this PR fixes
//   3. round-trip through the persistence file: a "cold restart" simulated by
//      wiping module-global state and re-hydrating from the on-disk snapshot
//      surfaces the created user
//   4. emit an audit-log entry on each successful mutation
//
// The cookies() call inside `getCurrentApiUser()` is mocked to return a System
// Admin user id (middleware already gates /api/users to System Admin in
// production, so this is the realistic auth context for these routes).
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
  tempDir = await mkdtemp(path.join(tmpdir(), 'pr07-users-route-'));
  originalPersistFile = process.env.PROJECT_DEMO_STATE_FILE;
  process.env.PROJECT_DEMO_STATE_FILE = path.join(tempDir, 'project-demo-state.json');
  // Defensively ensure no blob token sneaks in.
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
  // Start each test with no on-disk snapshot.
  await rm(path.join(tempDir, 'project-demo-state.json'), { force: true });
});

afterEach(() => {
  vi.restoreAllMocks();
});

const NEW_USER_PAYLOAD = {
  name: 'Persistence Smoke User',
  position: 'QA',
  role: 'Engineer' as const,
  department: 'กองพัฒนาโครงการ',
  departmentId: 'dept-002-1',
  status: 'active' as const,
  email: 'smoke@example.com',
  phone: '02-000-0000',
};

describe('POST /api/users persistence (PR-07)', () => {
  it('persists a newly created user so it survives a simulated cold restart', async () => {
    const { POST } = await import('./route');
    const { getUserStore } = await import('@/lib/user-store');
    const { getAuditLogStore } = await import('@/lib/audit-log-store');

    const before = getUserStore().length;
    const beforeAuditCount = getAuditLogStore().length;

    const response = await POST(
      new Request('http://localhost/api/users', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(NEW_USER_PAYLOAD),
      }),
    );
    expect(response.status).toBe(201);
    const body = (await response.json()) as { status: string; data: { id: string; name: string } };
    expect(body.status).toBe('success');
    expect(body.data.name).toBe(NEW_USER_PAYLOAD.name);

    // In-memory store has the new user.
    expect(getUserStore().length).toBe(before + 1);
    expect(getUserStore().some((u) => u.id === body.data.id)).toBe(true);

    // Audit log records the mutation.
    expect(getAuditLogStore().length).toBe(beforeAuditCount + 1);
    expect(getAuditLogStore()[0]?.action).toContain('เพิ่มผู้ใช้งาน');

    // On-disk snapshot includes the new user.
    const persistedRaw = await readFile(process.env.PROJECT_DEMO_STATE_FILE!, 'utf8');
    const persisted = JSON.parse(persistedRaw) as {
      users: Array<{ id: string; name: string }>;
      auditLogs: Array<{ action: string }>;
    };
    expect(persisted.users.some((u) => u.id === body.data.id)).toBe(true);
    expect(persisted.auditLogs.some((log) => log.action.includes(NEW_USER_PAYLOAD.name))).toBe(true);

    // Simulate cold restart: wipe in-memory state + hydration flags, then
    // re-hydrate from the persisted file. The user must still be there.
    resetGlobalDemoState();
    vi.resetModules();
    const { ensureProjectDemoStateHydrated } = await import('@/lib/project-demo-state');
    const { getUserStore: getUserStoreAfter } = await import('@/lib/user-store');
    await ensureProjectDemoStateHydrated();
    expect(getUserStoreAfter().some((u) => u.id === body.data.id)).toBe(true);
  });
});

describe('PATCH /api/users persistence (PR-07)', () => {
  it('persists a user update so it survives a simulated cold restart', async () => {
    const { PATCH } = await import('./route');
    const { getUserStore } = await import('@/lib/user-store');
    const { ensureProjectDemoStateHydrated } = await import('@/lib/project-demo-state');

    await ensureProjectDemoStateHydrated();
    const target = getUserStore()[0];
    expect(target).toBeDefined();
    const originalStatus = target.status;
    const newStatus = originalStatus === 'active' ? 'suspended' : 'active';

    const response = await PATCH(
      new Request('http://localhost/api/users', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          id: target.id,
          updates: { status: newStatus },
        }),
      }),
    );
    expect(response.status).toBe(200);

    // Verify file written.
    const persistedRaw = await readFile(process.env.PROJECT_DEMO_STATE_FILE!, 'utf8');
    const persisted = JSON.parse(persistedRaw) as {
      users: Array<{ id: string; status: string }>;
    };
    expect(persisted.users.find((u) => u.id === target.id)?.status).toBe(newStatus);

    // Simulate cold restart and confirm the change survived.
    resetGlobalDemoState();
    vi.resetModules();
    const { ensureProjectDemoStateHydrated: hydrate2 } = await import('@/lib/project-demo-state');
    const { getUserById: getUserByIdAfter } = await import('@/lib/user-store');
    await hydrate2();
    expect(getUserByIdAfter(target.id)?.status).toBe(newStatus);

    // Restore the test fixture state for isolation against other tests in this
    // suite that share the same persistence file path.
    const { PATCH: patchAgain } = await import('./route');
    await patchAgain(
      new Request('http://localhost/api/users', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ id: target.id, updates: { status: originalStatus } }),
      }),
    );
  });

  it('returns 404 + does NOT persist when the user is missing', async () => {
    const { PATCH } = await import('./route');
    const response = await PATCH(
      new Request('http://localhost/api/users', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          id: 'user-does-not-exist',
          updates: { status: 'active' },
        }),
      }),
    );
    expect(response.status).toBe(404);

    // No snapshot file should have been created by the failed branch — but
    // hydration itself may have created an empty file with default contents.
    // Either way the user must not be present.
    try {
      const persistedRaw = await readFile(process.env.PROJECT_DEMO_STATE_FILE!, 'utf8');
      const persisted = JSON.parse(persistedRaw) as {
        users: Array<{ id: string }>;
      };
      expect(persisted.users.some((u) => u.id === 'user-does-not-exist')).toBe(false);
    } catch (error) {
      if (
        error instanceof Error &&
        'code' in error &&
        (error as NodeJS.ErrnoException).code === 'ENOENT'
      ) {
        // No file written at all — also a valid outcome since the early-return
        // branch never reached persistProjectDemoState().
        return;
      }
      throw error;
    }
  });
});
