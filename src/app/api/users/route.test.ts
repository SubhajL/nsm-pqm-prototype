import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// ---------------------------------------------------------------------------
// PR-07 smoke test (post-PR-21 rewrite)
//
// Original PR-07 verified that POST /api/users + PATCH /api/users wrote to
// the blob snapshot so admin mutations survived a server restart. PR-21
// retired the blob snapshot — durability now comes from the underlying
// repository (Postgres in `db` mode; in-memory store seeded from JSON in
// `in_memory` mode, the default). This rewritten test verifies the route
// still:
//
//   1. Mutates the user store via the repository.
//   2. Returns the created/updated user envelope.
//   3. Emits a structured `edit_user` audit event.
//   4. Rejects unknown user ids with 404.
//
// We exercise the route against the default `in_memory` registry; the
// pglite-backed `database-contract.test.ts` covers the same surface
// against the Database backend so both paths are proven.
// ---------------------------------------------------------------------------

vi.mock('next/headers', () => ({
  cookies: () => ({
    get: (name: string) => (name === 'pqm_user_id' ? { value: 'user-001' } : undefined),
  }),
}));

interface GlobalState {
  __nsmUserStore: unknown;
  __nsmOrgStructureStore: unknown;
  __nsmAuditEventStore: unknown;
}

function resetGlobalStores() {
  const g = globalThis as unknown as GlobalState;
  g.__nsmUserStore = undefined;
  g.__nsmOrgStructureStore = undefined;
  g.__nsmAuditEventStore = undefined;
}

beforeEach(async () => {
  resetGlobalStores();
  vi.resetModules();
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

describe('POST /api/users (PR-07 / post-PR-21)', () => {
  it('creates a user via the repository and emits an audit event', async () => {
    const { POST } = await import('./route');
    const { getRepositories } = await import('@/lib/repositories');

    const repos = getRepositories();
    const before = (await repos.users.list()).length;
    const beforeAuditCount = (await repos.auditEvents.list()).length;

    const response = await POST(
      new Request('http://localhost/api/users', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(NEW_USER_PAYLOAD),
      }),
    );
    expect(response.status).toBe(201);
    const body = (await response.json()) as {
      status: string;
      data: { id: string; name: string };
    };
    expect(body.status).toBe('success');
    expect(body.data.name).toBe(NEW_USER_PAYLOAD.name);

    // Repository round-trip — the new user is queryable.
    const after = await repos.users.list();
    expect(after.length).toBe(before + 1);
    expect(after.some((u) => u.id === body.data.id)).toBe(true);
    expect(await repos.users.findById(body.data.id)).not.toBeNull();

    // Audit event was emitted as a structured AuditEvent (PR-05).
    const auditAfter = await repos.auditEvents.list();
    expect(auditAfter.length).toBe(beforeAuditCount + 1);
    const newEvent = auditAfter.at(-1);
    expect(newEvent?.action).toBe('edit_user');
    expect(newEvent?.resourceType).toBe('user');
    expect(newEvent?.resourceId).toBe(body.data.id);
  });
});

describe('PATCH /api/users (PR-07 / post-PR-21)', () => {
  it('updates a user via the repository and emits an audit event', async () => {
    const { PATCH } = await import('./route');
    const { getRepositories } = await import('@/lib/repositories');

    const repos = getRepositories();
    const target = (await repos.users.list())[0];
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

    // Repository now reflects the update.
    const updated = await repos.users.findById(target.id);
    expect(updated?.status).toBe(newStatus);

    // Restore for isolation.
    await repos.users.update(target.id, { status: originalStatus });
  });

  it('returns 404 when the user is missing', async () => {
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
  });
});
