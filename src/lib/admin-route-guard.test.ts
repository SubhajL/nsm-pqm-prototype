import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// ---------------------------------------------------------------------------
// Phase 1 — server-side admin/executive auth guard.
//
// Closes the dual-source bug where `middleware.ts` enforced admin gating
// against a static seed of users.json that admin-UI mutations never updated.
// The fix moves the authoritative role/status check INTO each handler via
// `requireAdminUser()` / `requireExecutiveUser()` in `project-api-access.ts`.
//
// This file is the contract test for those helpers: it asserts the matrix
// of (no cookie / suspended user / wrong role / right role) outcomes
// without going through any specific route handler. Per-route tests
// (`users/route.test.ts` etc.) then exercise the same matrix end-to-end.
// ---------------------------------------------------------------------------

let mockUserId: string | undefined = 'user-001';

vi.mock('next/headers', async () => {
  const { sealAuthCookieValueSync } = await import('@/lib/auth-cookie-node');
  return {
    cookies: () => ({
      get: (name: string) =>
        name === 'pqm_user_id' && mockUserId ? { value: sealAuthCookieValueSync('pqm_user_id', mockUserId) } : undefined,
    }),
  };
});

beforeEach(() => {
  mockUserId = 'user-001';
  vi.resetModules();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('requireAdminUser (Phase 1)', () => {
  it('returns null when the caller is a System Admin', async () => {
    mockUserId = 'user-001'; // System Admin in seeds.
    const { requireAdminUser } = await import('./project-api-access');
    const guard = await requireAdminUser();
    expect(guard).toBeNull();
  });

  it('returns a 401 when there is no cookie', async () => {
    mockUserId = undefined;
    const { requireAdminUser } = await import('./project-api-access');
    const guard = await requireAdminUser();
    expect(guard).not.toBeNull();
    expect(guard?.status).toBe(401);
    const body = (await guard?.json()) as { error?: { code?: string } };
    expect(body.error?.code).toBe('UNAUTHORIZED');
  });

  it('returns a 401 when the cookie points at an unknown user', async () => {
    mockUserId = 'user-does-not-exist';
    const { requireAdminUser } = await import('./project-api-access');
    const guard = await requireAdminUser();
    expect(guard).not.toBeNull();
    expect(guard?.status).toBe(401);
  });

  it('returns a 403 when the user is suspended (even with the right role)', async () => {
    // Create an isolated System Admin user, suspend it, then point the
    // cookie at it. Avoids mutating user-001 (the shared seed admin)
    // which other tests in the same vitest worker rely on.
    const { getRepositories } = await import('@/lib/repositories');
    const isolatedId = `user-test-suspended-${crypto.randomUUID()}`;
    await getRepositories().users.create({
      id: isolatedId,
      name: 'Suspended Admin Test User',
      position: 'QA',
      role: 'System Admin',
      department: 'QA',
      departmentId: 'dept-qa',
      status: 'suspended',
      projectCount: 0,
      email: 'qa-suspended@example.com',
      phone: '0',
    });

    mockUserId = isolatedId;
    const { requireAdminUser } = await import('./project-api-access');
    const guard = await requireAdminUser();
    expect(guard).not.toBeNull();
    expect(guard?.status).toBe(403);
    const body = (await guard?.json()) as { error?: { code?: string } };
    expect(body.error?.code).toBe('ACCOUNT_INACTIVE');
  });

  it('returns a 403 when the user is active but the role lacks admin', async () => {
    mockUserId = 'user-003'; // Engineer, active.
    const { requireAdminUser } = await import('./project-api-access');
    const guard = await requireAdminUser();
    expect(guard).not.toBeNull();
    expect(guard?.status).toBe(403);
    const body = (await guard?.json()) as { error?: { code?: string } };
    expect(body.error?.code).toBe('FORBIDDEN');
  });
});

describe('requireExecutiveUser (Phase 1)', () => {
  it('returns null for a System Admin (the matrix grants exec to admins)', async () => {
    mockUserId = 'user-001';
    const { requireExecutiveUser } = await import('./project-api-access');
    const guard = await requireExecutiveUser();
    expect(guard).toBeNull();
  });

  it('returns null for an Executive', async () => {
    mockUserId = 'user-007'; // Executive in seed.
    const { requireExecutiveUser } = await import('./project-api-access');
    const guard = await requireExecutiveUser();
    expect(guard).toBeNull();
  });

  it('returns a 403 for a non-executive active user (Engineer)', async () => {
    mockUserId = 'user-003';
    const { requireExecutiveUser } = await import('./project-api-access');
    const guard = await requireExecutiveUser();
    expect(guard).not.toBeNull();
    expect(guard?.status).toBe(403);
  });

  it('returns a 401 when there is no cookie', async () => {
    mockUserId = undefined;
    const { requireExecutiveUser } = await import('./project-api-access');
    const guard = await requireExecutiveUser();
    expect(guard).not.toBeNull();
    expect(guard?.status).toBe(401);
  });
});
