import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// ---------------------------------------------------------------------------
// Phase 2-A — `withTransactionalAudit` contract test.
//
// Closes the team-lead review concern that mutation + audit-event append
// are NOT atomic today: `recordAuditEvent` is called after the repo
// write, so a crash between the two loses the audit entry. The helper
// wraps both in a single `db.transaction(...)` so they commit or roll
// back together.
//
// Verified behaviour:
//   1. Happy path — both the mutation and the audit event persist.
//   2. Rollback — when the callback throws AFTER a mutation, the row
//      disappears (transaction rolled back) and the audit event is
//      NOT in the log.
//   3. Audit-only failure — when `appendAudit` itself fails inside the
//      callback (e.g. constraint violation), the prior mutation is
//      also rolled back.
// ---------------------------------------------------------------------------

vi.mock('next/headers', async () => {
  const { sealAuthCookieValueSync } = await import('@/lib/auth-cookie-node');
  return {
    cookies: () => ({
      get: (name: string) =>
        name === 'pqm_user_id' ? { value: sealAuthCookieValueSync('pqm_user_id', 'user-001') } : undefined,
    }),
  };
});

interface GlobalState {
  __nsmAuditEventStore: unknown;
  __nsmChangeRequestStore: unknown;
}

function resetGlobalStores() {
  const g = globalThis as unknown as GlobalState;
  g.__nsmAuditEventStore = undefined;
  g.__nsmChangeRequestStore = undefined;
}

beforeEach(() => {
  resetGlobalStores();
  vi.resetModules();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('withTransactionalAudit (Phase 2-A)', () => {
  it('commits both the mutation and the audit event when the callback succeeds', async () => {
    const { getRepositories } = await import('@/lib/repositories');
    const { withTransactionalAudit } = await import('./audit-helpers');

    const repos = getRepositories();
    const target = (await repos.changeRequests.list())[0];
    expect(target).toBeDefined();
    const auditBefore = (await repos.auditEvents.list()).length;
    const taggedReason = `tx-test-success-${crypto.randomUUID().slice(0, 8)}`;

    const updated = await withTransactionalAudit(
      new Request('http://localhost/test', {
        headers: { 'x-request-id': 'tx-test-req-1' },
      }),
      async (txRepos, appendAudit) => {
        const result = await txRepos.changeRequests.update(target.id, {
          reason: taggedReason,
        });
        await appendAudit({
          action: 'transition_change_request',
          resourceType: 'change_request',
          resourceId: target.id,
          projectId: target.projectId,
          before: target,
          after: result,
          decisionReason: 'tx-test happy path',
          authorityBasis: 'TEST',
        });
        return result;
      },
    );

    expect(updated?.reason).toBe(taggedReason);

    // Visible OUTSIDE the transaction — committed.
    const fresh = await repos.changeRequests.findById(target.id);
    expect(fresh?.reason).toBe(taggedReason);

    const auditAfter = await repos.auditEvents.list();
    expect(auditAfter.length).toBe(auditBefore + 1);
    const event = auditAfter.find(
      (e) => e.resourceId === target.id && e.requestId === 'tx-test-req-1',
    );
    expect(event).toBeDefined();
    expect(event?.action).toBe('transition_change_request');

    // Restore the row so other tests in this worker stay stable.
    await repos.changeRequests.update(target.id, { reason: target.reason });
  });

  it('rolls back the mutation when the callback throws after writing', async () => {
    const { getRepositories } = await import('@/lib/repositories');
    const { withTransactionalAudit } = await import('./audit-helpers');

    const repos = getRepositories();
    const target = (await repos.changeRequests.list())[0];
    const originalReason = target.reason;
    const auditBefore = (await repos.auditEvents.list()).length;

    await expect(
      withTransactionalAudit(
        new Request('http://localhost/test', {
          headers: { 'x-request-id': 'tx-test-req-2' },
        }),
        async (txRepos, appendAudit) => {
          await txRepos.changeRequests.update(target.id, {
            reason: 'must-not-persist',
          });
          await appendAudit({
            action: 'transition_change_request',
            resourceType: 'change_request',
            resourceId: target.id,
            projectId: target.projectId,
            before: target,
            after: null,
            decisionReason: 'tx-test rollback path',
            authorityBasis: 'TEST',
          });
          throw new Error('synthetic post-mutation failure');
        },
      ),
    ).rejects.toThrow('synthetic post-mutation failure');

    // Row must be UNCHANGED — transaction rolled back.
    const fresh = await repos.changeRequests.findById(target.id);
    expect(fresh?.reason).toBe(originalReason);

    // Audit event must NOT have been committed.
    const auditAfter = await repos.auditEvents.list();
    expect(auditAfter.length).toBe(auditBefore);
    expect(
      auditAfter.find((e) => e.requestId === 'tx-test-req-2'),
    ).toBeUndefined();
  });

  it('rolls back when the audit append itself rejects inside the callback', async () => {
    const { getRepositories } = await import('@/lib/repositories');
    const { withTransactionalAudit } = await import('./audit-helpers');

    const repos = getRepositories();
    const target = (await repos.changeRequests.list())[0];
    const originalReason = target.reason;
    const auditBefore = (await repos.auditEvents.list()).length;

    // Force the underlying audit-event repository's `append` to reject
    // ONCE — simulates a constraint violation / connection drop the
    // moment the audit insert hits Postgres. The spy is on the
    // prototype so it intercepts the tx-scoped repo as well.
    const { DatabaseAuditEventRepository } = await import('@/lib/db/repositories');
    const appendSpy = vi
      .spyOn(DatabaseAuditEventRepository.prototype, 'append')
      .mockRejectedValueOnce(new Error('forced audit-append failure'));

    try {
      await expect(
        withTransactionalAudit(
          new Request('http://localhost/test', {
            headers: { 'x-request-id': 'tx-test-req-3' },
          }),
          async (txRepos, appendAudit) => {
            await txRepos.changeRequests.update(target.id, {
              reason: 'should-rollback-too',
            });
            await appendAudit({
              action: 'transition_change_request',
              resourceType: 'change_request',
              resourceId: target.id,
              projectId: target.projectId,
              before: target,
              after: null,
              decisionReason: 'tx-test audit-failure path',
              authorityBasis: 'TEST',
            });
          },
        ),
      ).rejects.toThrow('forced audit-append failure');

      // Mutation rolled back — reason unchanged.
      const fresh = await repos.changeRequests.findById(target.id);
      expect(fresh?.reason).toBe(originalReason);
      // Audit list unchanged — neither the forced-fail append nor any
      // partial state landed.
      expect((await repos.auditEvents.list()).length).toBe(auditBefore);
    } finally {
      appendSpy.mockRestore();
    }
  });

  it('falls back to a synthetic requestId when the inbound request has no x-request-id header', async () => {
    const { getRepositories } = await import('@/lib/repositories');
    const { withTransactionalAudit } = await import('./audit-helpers');

    const repos = getRepositories();
    const target = (await repos.changeRequests.list())[0];
    const auditBefore = (await repos.auditEvents.list()).length;

    await withTransactionalAudit(
      new Request('http://localhost/test'), // no x-request-id
      async (txRepos, appendAudit) => {
        await appendAudit({
          action: 'transition_change_request',
          resourceType: 'change_request',
          resourceId: target.id,
          projectId: target.projectId,
          before: null,
          after: null,
          decisionReason: 'no-request-id path',
          authorityBasis: 'TEST',
        });
      },
    );

    const auditAfter = await repos.auditEvents.list();
    expect(auditAfter.length).toBe(auditBefore + 1);
    // List is sorted by timestamp asc; some seed audit logs are dated
    // in the future relative to the test run, so find by decisionReason
    // instead of relying on position. The synthetic id is generated by
    // the helper itself — `evt-req-*`.
    const myEvent = auditAfter.find(
      (e) => e.decisionReason === 'no-request-id path',
    );
    expect(myEvent).toBeDefined();
    expect(myEvent?.requestId).toMatch(/^evt-req-/);
  });
});
