import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';

// ---------------------------------------------------------------------------
// PATCH /api/projects/[id]/lifecycle tests (PR-16, post-PR-21 rewrite)
//
// Covers the contract surface that the RidLifecycleGates component talks to:
//   - 400 VALIDATION_FAILED for malformed body
//   - 403 FORBIDDEN for users without `advance_lifecycle_stage`
//   - 404 NOT_FOUND for unknown project ids
//   - 409 STAGE_GATE_BLOCKED with `missing` shape when artifacts missing
//   - 200 success when artifacts satisfy canEnterStage()
//   - audit-event side effect on success
//
// Post-PR-21: no temp blob snapshot. Tests exercise the repository
// directly to verify the mutation happened and the audit event landed.
// ---------------------------------------------------------------------------

interface CookieContext {
  userId: string | undefined;
}

const cookieCtx: CookieContext = { userId: undefined };

vi.mock('next/headers', () => ({
  cookies: () => ({
    get: (name: string) =>
      name === 'pqm_user_id' && cookieCtx.userId
        ? { value: cookieCtx.userId }
        : undefined,
  }),
}));

interface GlobalState {
  __nsmProjectStore: unknown;
  __nsmAuditEventStore: unknown;
}

function resetGlobalStores() {
  const g = globalThis as unknown as GlobalState;
  g.__nsmProjectStore = undefined;
  g.__nsmAuditEventStore = undefined;
}

beforeEach(async () => {
  resetGlobalStores();
  vi.resetModules();
  cookieCtx.userId = undefined;
});

afterEach(() => {
  vi.restoreAllMocks();
});

// user-002 is a Project Manager on proj-001 (per project-memberships seed).
const PM_USER_ID = 'user-002';
const PROJ_ID = 'proj-001';
// user-003 is an Engineer on proj-001 — has visibility but NOT
// advance_lifecycle_stage in AUTHZ_MATRIX (Engineer is intentionally
// excluded from lifecycle advancement).
const ENGINEER_USER_ID = 'user-003';

function makeRequest(body: unknown): Request {
  return new Request('http://localhost/api/projects/proj-001/lifecycle', {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('PATCH /api/projects/[id]/lifecycle — auth & validation', () => {
  it('returns 400 VALIDATION_FAILED when body is missing required fields', async () => {
    cookieCtx.userId = PM_USER_ID;
    const { PATCH } = await import('./route');
    const response = await PATCH(makeRequest({ foo: 'bar' }), {
      params: { id: PROJ_ID },
    });
    expect(response.status).toBe(400);
    const body = (await response.json()) as { error: { code: string } };
    expect(body.error.code).toBe('VALIDATION_FAILED');
  });

  it('returns 403 FORBIDDEN when the user lacks advance_lifecycle_stage', async () => {
    cookieCtx.userId = ENGINEER_USER_ID;
    const { PATCH } = await import('./route');
    const response = await PATCH(
      makeRequest({ targetStage: 'land_acquisition', artifactDocIds: [] }),
      { params: { id: PROJ_ID } },
    );
    expect(response.status).toBe(403);
    const body = (await response.json()) as { error: { code: string } };
    expect(body.error.code).toBe('FORBIDDEN');
  });

  it('returns 4xx when project id does not exist (System Admin)', async () => {
    cookieCtx.userId = 'user-001';
    const { PATCH } = await import('./route');
    const response = await PATCH(
      new Request('http://localhost/api/projects/does-not-exist/lifecycle', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          targetStage: 'land_acquisition',
          artifactDocIds: [],
        }),
      }),
      { params: { id: 'does-not-exist' } },
    );
    expect([403, 404]).toContain(response.status);
  });
});

describe('PATCH /api/projects/[id]/lifecycle — 409 STAGE_GATE_BLOCKED', () => {
  it('returns 409 with code STAGE_GATE_BLOCKED + missing[] when entering construction without SOP 8.2', async () => {
    cookieCtx.userId = PM_USER_ID;
    const { PATCH } = await import('./route');

    const response = await PATCH(
      makeRequest({ targetStage: 'construction', artifactDocIds: [] }),
      { params: { id: PROJ_ID } },
    );

    expect(response.status).toBe(409);
    const body = (await response.json()) as {
      status: string;
      error: {
        code: string;
        message: string;
        targetStage: string;
        missing: Array<{ key: string; label: string; sopReference: string | null }>;
      };
    };
    expect(body.status).toBe('error');
    expect(body.error.code).toBe('STAGE_GATE_BLOCKED');
    expect(body.error.targetStage).toBe('construction');
    expect(body.error.missing).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          key: 'sop_8_2_construction_approval',
          sopReference: expect.stringMatching(/SOP 8\.2/),
        }),
      ]),
    );
  });
});

describe('PATCH /api/projects/[id]/lifecycle — 200 success path', () => {
  it('advances the project to a stage with no required artifacts and records an audit event', async () => {
    cookieCtx.userId = PM_USER_ID;

    const { PATCH } = await import('./route');
    const { getRepositories } = await import('@/lib/repositories');

    const repos = getRepositories();
    const beforeAuditCount = (await repos.auditEvents.list()).length;

    const response = await PATCH(
      makeRequest({ targetStage: 'land_acquisition', artifactDocIds: [] }),
      { params: { id: PROJ_ID } },
    );

    expect(response.status).toBe(200);
    const body = (await response.json()) as {
      status: string;
      data: {
        currentLifecycleStage: string;
        lifecycleStageHistory: Array<{ stage: string; enteredBy: string | null }>;
      };
    };
    expect(body.status).toBe('success');
    expect(body.data.currentLifecycleStage).toBe('land_acquisition');
    expect(body.data.lifecycleStageHistory.at(-1)).toMatchObject({
      stage: 'land_acquisition',
      enteredBy: PM_USER_ID,
    });

    // Repository now reflects the new stage.
    const project = await repos.projects.findById(PROJ_ID);
    expect(project?.currentLifecycleStage).toBe('land_acquisition');

    // One audit event was recorded.
    const auditAfter = await repos.auditEvents.list();
    expect(auditAfter.length).toBe(beforeAuditCount + 1);
    const evt = auditAfter.find(
      (event) =>
        event.resourceType === 'project' &&
        event.resourceId === PROJ_ID &&
        event.action === 'advance_lifecycle_stage',
    );
    expect(evt?.action).toBe('advance_lifecycle_stage');
    expect(evt?.resourceType).toBe('project');
    expect(evt?.resourceId).toBe(PROJ_ID);
  });
});
