import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// ---------------------------------------------------------------------------
// Phase 2-A — Daily-report status transition is a 3-way atomic operation:
// `dailyReports.update` + `notifications.push` + audit append all commit
// or roll back together. This file exercises the rollback paths the
// generic `audit-helpers.transactional.test.ts` cannot — specifically the
// notification side-effect, which only the daily-report route emits.
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
  __nsmDailyReportStore: unknown;
  __nsmNotificationStore: unknown;
  __nsmAuditEventStore: unknown;
}

function resetGlobalStores() {
  const g = globalThis as unknown as GlobalState;
  g.__nsmDailyReportStore = undefined;
  g.__nsmNotificationStore = undefined;
  g.__nsmAuditEventStore = undefined;
}

beforeEach(() => {
  resetGlobalStores();
  vi.resetModules();
});

afterEach(() => {
  vi.restoreAllMocks();
});

async function patchDailyReport(reportId: string, body: unknown) {
  const { PATCH } = await import('./route');
  return PATCH(
    new Request(`http://localhost/api/daily-reports/${reportId}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    }),
    { params: { id: reportId } },
  );
}

describe('PATCH /api/daily-reports/[id] — transactional rollback', () => {
  it('rolls back the status change AND the notification when the audit append fails', async () => {
    const { getRepositories } = await import('@/lib/repositories');
    const { DatabaseAuditEventRepository } = await import(
      '@/lib/db/repositories'
    );

    // Pick a submittable draft report.
    const repos = getRepositories();
    const reports = await repos.dailyReports.list();
    const draft = reports.find((r) => r.status === 'draft');
    expect(draft).toBeDefined();
    if (!draft) return;

    const notificationsBefore = (await repos.notifications.list()).length;
    const auditBefore = (await repos.auditEvents.list()).length;

    // Force the audit append to reject just like a constraint violation
    // would. The transaction must roll back the dailyReports.update AND
    // the notifications.push that happened earlier in the callback.
    const appendSpy = vi
      .spyOn(DatabaseAuditEventRepository.prototype, 'append')
      .mockRejectedValueOnce(new Error('forced audit failure'));

    try {
      // The route does not wrap the transactional callback in a try/catch,
      // so a forced rollback bubbles up as a thrown error (Next.js would
      // convert it to a 500 in production; here we observe the throw
      // directly).
      await expect(
        patchDailyReport(draft.id, { status: 'submitted' }),
      ).rejects.toThrow('forced audit failure');
    } finally {
      appendSpy.mockRestore();
    }

    // Daily-report status must be UNCHANGED.
    const fresh = await repos.dailyReports.findById(draft.id);
    expect(fresh?.status).toBe('draft');
    // No notification got persisted.
    expect((await repos.notifications.list()).length).toBe(notificationsBefore);
    // No audit event either.
    expect((await repos.auditEvents.list()).length).toBe(auditBefore);
  });
});
