import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// ---------------------------------------------------------------------------
// PR-07 smoke test for /api/org-structure (post-PR-21 rewrite)
//
// Original PR-07 verified blob-snapshot persistence. PR-21 retired the
// blob snapshot — durability now comes from the underlying repository.
// This rewritten test verifies the route still:
//
//   1. Mutates the org-structure store via the repository (CREATE / PATCH /
//      DELETE).
//   2. Emits a structured `edit_org_structure` audit event per mutation.
//   3. Supports both the flat-list GET and the asTree GET (PR-17).
// ---------------------------------------------------------------------------

vi.mock('next/headers', async () => {
  const { sealAuthCookieValueSync } = await import('@/lib/auth-cookie-node');
  return {
    cookies: () => ({
      get: (name: string) => (name === 'pqm_user_id' ? { value: sealAuthCookieValueSync('pqm_user_id', 'user-001') } : undefined),
    }),
  };
});

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

// PR-17: the org-unit body now follows the `RidOrgUnit` discriminated union
// (PR-13 vocabulary).
const NEW_ORG_UNIT_PAYLOAD = {
  kind: 'bureau' as const,
  name: 'หน่วยทดสอบความคงทน',
  nameEn: 'Persistence Test Unit',
  parentId: 'dept-root',
  costCenter: null,
};

describe('POST /api/org-structure (PR-07 / post-PR-21)', () => {
  it('creates an org unit via the repository and emits an audit event', async () => {
    const { POST } = await import('./route');
    const { getRepositories } = await import('@/lib/repositories');

    const repos = getRepositories();
    const before = (await repos.orgStructure.list()).length;
    const beforeAuditCount = (await repos.auditEvents.list()).length;

    const response = await POST(
      new Request('http://localhost/api/org-structure', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(NEW_ORG_UNIT_PAYLOAD),
      }),
    );
    expect(response.status).toBe(201);
    const body = (await response.json()) as {
      status: string;
      data: { id: string; name: string };
    };
    expect(body.status).toBe('success');
    expect(body.data.name).toBe(NEW_ORG_UNIT_PAYLOAD.name);

    const after = await repos.orgStructure.list();
    expect(after.length).toBe(before + 1);

    const auditAfter = await repos.auditEvents.list();
    expect(auditAfter.length).toBe(beforeAuditCount + 1);
    const newEvent = auditAfter.find((event) => event.resourceId === body.data.id);
    expect(newEvent?.action).toBe('edit_org_structure');
    expect(newEvent?.resourceType).toBe('org_unit');
    expect(newEvent?.resourceId).toBe(body.data.id);
  });
});

describe('PATCH /api/org-structure (PR-07 / post-PR-21)', () => {
  it('updates an org unit via the repository', async () => {
    const { POST, PATCH } = await import('./route');
    const { getRepositories } = await import('@/lib/repositories');

    const createResponse = await POST(
      new Request('http://localhost/api/org-structure', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(NEW_ORG_UNIT_PAYLOAD),
      }),
    );
    const createdId = ((await createResponse.json()) as { data: { id: string } }).data
      .id;

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

    const repos = getRepositories();
    const updated = await repos.orgStructure.findById(createdId);
    expect(updated?.nameEn).toBe('Persistence Test Unit (Renamed)');
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
    const dept001 = body.data!.children.find((node) => node.unit.id === 'dept-001');
    expect(dept001).toBeDefined();
    expect(dept001!.children.length).toBeGreaterThan(0);
  });
});

describe('DELETE /api/org-structure (PR-07 / post-PR-21)', () => {
  it('deletes an org unit via the repository', async () => {
    const { POST, DELETE } = await import('./route');
    const { getRepositories } = await import('@/lib/repositories');

    const createResponse = await POST(
      new Request('http://localhost/api/org-structure', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(NEW_ORG_UNIT_PAYLOAD),
      }),
    );
    const createdId = ((await createResponse.json()) as { data: { id: string } }).data
      .id;

    const deleteResponse = await DELETE(
      new Request('http://localhost/api/org-structure', {
        method: 'DELETE',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ id: createdId }),
      }),
    );
    expect(deleteResponse.status).toBe(200);

    const repos = getRepositories();
    expect(await repos.orgStructure.findById(createdId)).toBeNull();
  });
});
