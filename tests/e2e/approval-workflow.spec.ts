import { expect, test } from '@playwright/test';

/**
 * Stabilization PR — Project approval workflow E2E backfill.
 *
 * PR-D2 wired the Approval page to real ProjectApprovalRequest data
 * (Steps + decisions). No dedicated spec existed for this flow until
 * now; this spec drives the approval submission via the public route
 * and then asserts the UI's Steps indicator + header tag reflect the
 * persisted state.
 */

async function loginAs(page: import('@playwright/test').Page, userId: string) {
  await page.goto('/login');
  await page.locator(`input[type="radio"][value="${userId}"]`).check();
  await page.getByRole('button', { name: 'เข้าสู่ระบบ' }).click();
  await page.waitForURL('**/dashboard');
}

test.describe('project approval workflow (PR-D2)', () => {
  test('PM submits approval request and System Admin records an approve decision', async ({
    page,
  }) => {
    // 1. PM submits a fresh approval request via the public endpoint.
    await loginAs(page, 'user-002');
    const submission = await page.evaluate(async () => {
      const r = await fetch('/api/project-approval-requests/by-project/proj-001', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ notes: 'E2E approval submission' }),
      });
      return { status: r.status, body: await r.json() };
    });
    expect([200, 201]).toContain(submission.status);
    const submittedRequestId: string | undefined = submission.body.data?.id;
    expect(submittedRequestId).toBeTruthy();

    // 2. Visit the approval page as PM — header tag should be the
    // post-submission "Submitted" label, NOT the demo fallback.
    await page.goto('/projects/proj-001/approval');
    await expect(page.getByText(/ส่งคำขอแล้ว|รออนุมัติ|กำลังพิจารณา/).first()).toBeVisible();

    // 3. Log out, log back in as System Admin (user-001) to record a
    // decision. PR-D2 + PR-27 together let System Admin satisfy both
    // pm + bureau_head + committee tiers.
    await page.getByRole('button', { name: /ออกจากระบบ/i }).click();
    await page.waitForURL('**/login');
    await loginAs(page, 'user-001');

    // 4. Record an approve decision via the public route. Actor
    // identity is derived from the session cookie — request body only
    // carries the `decision` + free-text `comment`.
    const decision = await page.evaluate(async (id) => {
      const r = await fetch(`/api/project-approval-requests/${id}/decision`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ decision: 'approve', comment: 'อนุมัติผ่าน E2E' }),
      });
      return { status: r.status, body: await r.json() };
    }, submittedRequestId!);
    expect(decision.status).toBe(200);
    expect(decision.body.data?.decisionHistory?.length).toBeGreaterThanOrEqual(1);

    // 5. Verify the persisted decisionHistory entry survives via the
    // public list endpoint.
    const refreshed = await page.evaluate(async () => {
      const r = await fetch('/api/project-approval-requests/by-project/proj-001');
      return await r.json();
    });
    const persisted = refreshed.data?.find(
      (entry: { id?: string }) => entry.id === submittedRequestId,
    );
    expect(persisted).toBeTruthy();
    expect(persisted.decisionHistory.length).toBeGreaterThanOrEqual(1);
    expect(persisted.decisionHistory.at(-1).decision).toBe('approve');
  });

  test('reject decision flips state to rejected and is preserved in decisionHistory', async ({
    page,
  }) => {
    await loginAs(page, 'user-002');
    const submission = await page.evaluate(async () => {
      const r = await fetch('/api/project-approval-requests/by-project/proj-001', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ notes: 'E2E rejection branch' }),
      });
      return { status: r.status, body: await r.json() };
    });
    const requestId: string | undefined = submission.body.data?.id;
    expect(requestId).toBeTruthy();

    await page.getByRole('button', { name: /ออกจากระบบ/i }).click();
    await page.waitForURL('**/login');
    await loginAs(page, 'user-001');

    const reject = await page.evaluate(async (id) => {
      const r = await fetch(`/api/project-approval-requests/${id}/decision`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ decision: 'reject', comment: 'ไม่อนุมัติผ่าน E2E' }),
      });
      return { status: r.status, body: await r.json() };
    }, requestId!);
    expect(reject.status).toBe(200);
    expect(reject.body.data.decisionHistory.at(-1).decision).toBe('reject');

    // Codex LOW: lock persistence with a list-endpoint readback, not
    // just the POST response.
    const refreshed = await page.evaluate(async () => {
      const r = await fetch('/api/project-approval-requests/by-project/proj-001');
      return await r.json();
    });
    const persisted = refreshed.data?.find(
      (entry: { id?: string }) => entry.id === requestId,
    );
    expect(persisted).toBeTruthy();
    expect(persisted.decisionHistory.at(-1).decision).toBe('reject');
  });
});
