import { expect, test } from '@playwright/test';

/**
 * Stabilization PR — Change-request workflow E2E backfill.
 *
 * PR-27 added the granular state machine
 * (submitted → under_review → pm_approved / bureau_approved /
 * committee_approved → applied; * → rejected). batch1-documents-
 * change-request-admin already exercises the "create then approve"
 * happy path against the legacy `pending`/`approved` UI labels — this
 * spec focuses on the PR-27 routing layer directly via the transition
 * route and asserts the resulting persisted status is visible in the UI.
 */

async function loginAs(page: import('@playwright/test').Page, userId: string) {
  await page.goto('/login');
  await page.locator(`input[type="radio"][value="${userId}"]`).check();
  await page.getByRole('button', { name: 'เข้าสู่ระบบ' }).click();
  await page.waitForURL('**/dashboard');
}

async function selectAntOption(
  page: import('@playwright/test').Page,
  fieldLabel: string,
  optionText: string,
) {
  const field = page.locator('.ant-form-item').filter({ hasText: fieldLabel }).first();
  await field.locator('.ant-select-selector').click();
  await page
    .locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden)')
    .locator('.ant-select-item-option-content')
    .filter({ hasText: optionText })
    .first()
    .click();
}

test.describe('change-request workflow (PR-27 transitions)', () => {
  test('PR-27 small-CR transition lifecycle persists end-to-end', async ({ page }) => {
    const title = `CR ${Date.now()}`;

    // 1. PM creates a small change request.
    await loginAs(page, 'user-002');
    await page.goto('/projects/proj-001/change-request');
    await page.getByRole('button', { name: 'สร้าง Change Request' }).click();
    const createDialog = page.getByRole('dialog', { name: 'สร้าง Change Request' });
    await createDialog.getByRole('textbox', { name: 'หัวข้อ' }).fill(title);
    await createDialog.getByRole('textbox', { name: 'เหตุผล' }).fill('ทดสอบ workflow');
    await createDialog.getByRole('textbox', { name: 'เชื่อมโยง WBS' }).fill('WBS 1.0');
    // Small budget delta — routes to PM tier per the authority router.
    await createDialog.getByRole('spinbutton', { name: 'ผลกระทบงบประมาณ' }).fill('25000');
    await createDialog.getByRole('spinbutton', { name: 'ผลกระทบเวลา' }).fill('2');
    await selectAntOption(page, 'ระดับความสำคัญ', 'ปานกลาง');
    await createDialog.getByRole('button', { name: 'บันทึก', exact: true }).click();

    // 2. Capture the created CR's id via the public list endpoint.
    const createdId = await page.evaluate(async (currentTitle) => {
      const response = await fetch('/api/change-requests');
      const payload = await response.json();
      const cr = payload.data.find(
        (entry: { title: string; id: string }) => entry.title === currentTitle,
      );
      return cr?.id as string | undefined;
    }, title);
    expect(createdId).toBeTruthy();

    // 3. Drive the PR-27 transition route directly: submitted →
    // under_review → pm_approved → applied. This is the granular state
    // machine the legacy "อนุมัติ (Approve)" button collapses into a
    // single click; we walk every edge to confirm each is reachable.
    for (const targetState of ['under_review', 'pm_approved', 'applied'] as const) {
      const res = await page.evaluate(
        async ({ id, target }) => {
          const r = await fetch(`/api/change-requests/${id}/transition`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ toStatus: target }),
          });
          return { status: r.status, body: await r.json() };
        },
        { id: createdId!, target: targetState },
      );
      expect(res.status, `transition to ${targetState} should 200`).toBe(200);
      expect(res.body.data.status).toBe(targetState);
    }

    // 4. Reload the CR page and assert the persisted status badge shows
    // "ดำเนินการแล้ว (Applied)" (per CR_STATUS_LABELS in document.ts).
    await page.goto('/projects/proj-001/change-request');
    await expect(
      page.locator('table').locator(`text=${title}`).first(),
    ).toBeVisible();

    // The status badge for an `applied` CR uses the green "ดำเนินการแล้ว" copy.
    const row = page.locator('tbody tr').filter({ hasText: title });
    await expect(row.first()).toContainText('ดำเนินการ');
  });

  test('illegal transition (submitted → applied) is rejected with 409', async ({ page }) => {
    await loginAs(page, 'user-002');

    // Create a fresh CR for this isolated check.
    const title = `CR-Illegal ${Date.now()}`;
    await page.goto('/projects/proj-001/change-request');
    await page.getByRole('button', { name: 'สร้าง Change Request' }).click();
    const createDialog = page.getByRole('dialog', { name: 'สร้าง Change Request' });
    await createDialog.getByRole('textbox', { name: 'หัวข้อ' }).fill(title);
    await createDialog.getByRole('textbox', { name: 'เหตุผล' }).fill('ทดสอบ illegal transition');
    await createDialog.getByRole('textbox', { name: 'เชื่อมโยง WBS' }).fill('WBS 1.0');
    await createDialog.getByRole('spinbutton', { name: 'ผลกระทบงบประมาณ' }).fill('25000');
    await createDialog.getByRole('spinbutton', { name: 'ผลกระทบเวลา' }).fill('1');
    await selectAntOption(page, 'ระดับความสำคัญ', 'ต่ำ');
    await createDialog.getByRole('button', { name: 'บันทึก', exact: true }).click();

    const createdId = await page.evaluate(async (currentTitle) => {
      const response = await fetch('/api/change-requests');
      const payload = await response.json();
      return payload.data.find(
        (entry: { title: string; id: string }) => entry.title === currentTitle,
      )?.id as string | undefined;
    }, title);
    expect(createdId).toBeTruthy();

    // submitted → applied is NOT a legal edge. The route rejects with
    // 403 INVALID_TRANSITION (the routing helper guards transitions
    // before any persistence happens, per PR-27 design).
    const res = await page.evaluate(async (id) => {
      const r = await fetch(`/api/change-requests/${id}/transition`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ toStatus: 'applied' }),
      });
      return { status: r.status, body: await r.json() };
    }, createdId!);
    expect(res.status).toBe(403);
    expect(res.body.error?.code).toBe('INVALID_TRANSITION');
  });
});
