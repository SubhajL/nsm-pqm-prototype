import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// ---------------------------------------------------------------------------
// `/api/evaluation/[projectId]` — executive-or-admin gating + repository-
// backed read/upsert (Bucket 2: evaluation persistence).
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

const validBody = {
  evaluatedBy: 'user-007',
  evaluatedAt: '2026-09-20',
  categories: [
    { name: 'งบประมาณ', nameEn: 'Budget', score: 4, note: '' },
    { name: 'คุณภาพ', nameEn: 'Quality', score: 4, note: 'ดี' },
  ],
  recommendation: 'ปรับปรุงการวางแผนจัดซื้อ',
};

async function callGet(projectId: string): Promise<Response> {
  const { GET } = await import('./route');
  return GET(new Request(`http://localhost/api/evaluation/${projectId}`), {
    params: Promise.resolve({ projectId }),
  });
}

async function callPost(projectId: string, body: unknown): Promise<Response> {
  const { POST } = await import('./route');
  return POST(
    new Request(`http://localhost/api/evaluation/${projectId}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    }),
    { params: Promise.resolve({ projectId }) },
  );
}

describe('GET /api/evaluation/[projectId] — executive gating', () => {
  it('returns the seeded evaluation for an Executive', async () => {
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

  it('returns 404 for a project with no evaluation', async () => {
    mockUserId = 'user-007';
    const response = await callGet('proj-001');
    expect(response.status).toBe(404);
  });
});

describe('POST /api/evaluation/[projectId] — upsert', () => {
  it('creates an evaluation and derives the summary server-side', async () => {
    mockUserId = 'user-007';
    const response = await callPost('proj-001', validBody);
    expect([200, 201]).toContain(response.status);
    const json = await response.json();
    // [4,4] mean 4 / 5 → 80% → Very Good. Client never sends these.
    expect(json.data.percentage).toBe(80);
    expect(json.data.overallScore).toBe(4);
    expect(json.data.level).toBe('ดีมาก (Very Good)');
    expect(json.data.maxScore).toBe(5);
  });

  it('persists — a subsequent GET returns the upserted evaluation', async () => {
    mockUserId = 'user-007';
    await callPost('proj-001', validBody);
    const get = await callGet('proj-001');
    expect(get.status).toBe(200);
    const json = await get.json();
    expect(json.data.recommendation).toBe('ปรับปรุงการวางแผนจัดซื้อ');
  });

  it('rejects a client-supplied derived summary (400)', async () => {
    mockUserId = 'user-007';
    const response = await callPost('proj-001', { ...validBody, percentage: 99 });
    expect(response.status).toBe(400);
  });

  it('returns 403 for a non-executive (Engineer)', async () => {
    mockUserId = 'user-003';
    const response = await callPost('proj-001', validBody);
    expect(response.status).toBe(403);
  });

  it('returns 404 when the project does not exist', async () => {
    mockUserId = 'user-007';
    const response = await callPost('proj-nonexistent', validBody);
    expect(response.status).toBe(404);
  });
});
