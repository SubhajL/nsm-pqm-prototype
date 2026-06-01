import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// ---------------------------------------------------------------------------
// Phase 1 — `/api/evaluation/[projectId]` executive-or-admin gating.
// ---------------------------------------------------------------------------

let mockUserId: string | undefined = 'user-007';

vi.mock('next/headers', () => ({
  cookies: () => ({
    get: (name: string) =>
      name === 'pqm_user_id' && mockUserId ? { value: mockUserId } : undefined,
  }),
}));

beforeEach(() => {
  mockUserId = 'user-007'; // Executive in seed.
  vi.resetModules();
});

afterEach(() => {
  vi.restoreAllMocks();
});

async function callGet(projectId: string): Promise<Response> {
  const { GET } = await import('./route');
  return GET(new Request(`http://localhost/api/evaluation/${projectId}`), {
    params: Promise.resolve({ projectId }),
  });
}

describe('GET /api/evaluation/[projectId] — executive gating', () => {
  it('returns the evaluation for an Executive', async () => {
    mockUserId = 'user-007';
    const response = await callGet('proj-005');
    expect(response.status).toBe(200);
  });

  it('returns the evaluation for a System Admin too', async () => {
    mockUserId = 'user-001';
    const response = await callGet('proj-005');
    expect(response.status).toBe(200);
  });

  it('returns 403 FORBIDDEN for an Engineer (non-executive)', async () => {
    mockUserId = 'user-003';
    const response = await callGet('proj-005');
    expect(response.status).toBe(403);
  });

  it('returns 401 UNAUTHORIZED with no cookie', async () => {
    mockUserId = undefined;
    const response = await callGet('proj-005');
    expect(response.status).toBe(401);
  });
});
