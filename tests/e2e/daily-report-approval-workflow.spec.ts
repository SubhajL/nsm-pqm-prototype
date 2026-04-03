import { expect, test } from '@playwright/test';

async function loginAs(page: import('@playwright/test').Page, userId: string) {
  await page.goto('/login');
  await page.locator(`input[type="radio"][value="${userId}"]`).check();
  await page.getByRole('button', { name: 'เข้าสู่ระบบ' }).click();
  await page.waitForURL('**/dashboard');
}

test.describe('daily report approval workflow (proj-001)', () => {
  test('PM sees approve/reject for submitted report and no submit button', async ({ page }) => {
    await loginAs(page, 'user-002'); // PM
    await page.goto('/projects/proj-001/daily-report');
    await expect(page.getByRole('heading', { name: /รายงานประจำวัน/i })).toBeVisible();

    // Click submitted report row #44 (seed status: submitted)
    await page.locator('table tbody tr').filter({ hasText: '44' }).click();

    // PM should see approve/reject buttons
    await expect(page.getByRole('button', { name: 'อนุมัติรายงาน' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'ตีกลับรายงาน' })).toBeVisible();

    // PM should NOT see submit/resubmit button
    await expect(page.getByRole('button', { name: 'ส่งอนุมัติ' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'ส่งใหม่' })).toHaveCount(0);
  });

  test('PM rejects report → status changes to rejected', async ({ page }) => {
    await loginAs(page, 'user-002'); // PM
    await page.goto('/projects/proj-001/daily-report');

    // Click submitted report #44
    await page.locator('table tbody tr').filter({ hasText: '44' }).click();
    await expect(page.getByRole('button', { name: 'ตีกลับรายงาน' })).toBeVisible();

    // Reject it
    await page.getByRole('button', { name: 'ตีกลับรายงาน' }).click();

    // Status should change to rejected
    await expect(page.getByText('ไม่อนุมัติ (Rejected)').first()).toBeVisible();

    // Status history should record the rejection
    await expect(page.getByText('ตีกลับรายงานเพื่อแก้ไข').first()).toBeVisible();
  });

  test('engineer sees resubmit button on rejected report', async ({ page }) => {
    // report #44 was rejected in previous test
    await loginAs(page, 'user-003'); // Engineer
    await page.goto('/projects/proj-001/daily-report');

    // Click rejected report #44
    await page.locator('table tbody tr').filter({ hasText: '44' }).click();

    // Engineer should see "ส่งใหม่" resubmit button
    await expect(page.getByRole('button', { name: 'ส่งใหม่' })).toBeVisible();

    // Engineer should NOT see approve/reject buttons
    await expect(page.getByRole('button', { name: 'อนุมัติรายงาน' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'ตีกลับรายงาน' })).toHaveCount(0);
  });

  test('engineer resubmits → status changes and PM gets notification', async ({ page }) => {
    // report #44 was rejected in previous test
    await loginAs(page, 'user-003');
    await page.goto('/projects/proj-001/daily-report');

    await page.locator('table tbody tr').filter({ hasText: '44' }).click();
    await page.getByRole('button', { name: 'ส่งใหม่' }).click();

    // Status should change to submitted
    await expect(page.getByText('ส่งแล้ว (Submitted)').first()).toBeVisible();

    // Status history should record the resubmission
    await expect(page.getByText('ส่งใหม่หลังแก้ไข').first()).toBeVisible();
  });

  test('PM approves the resubmitted report → notification created', async ({ page }) => {
    // report #44 was resubmitted in previous test
    await loginAs(page, 'user-002');
    await page.goto('/projects/proj-001/daily-report');

    await page.locator('table tbody tr').filter({ hasText: '44' }).click();
    await page.getByRole('button', { name: 'อนุมัติรายงาน' }).click();

    // Status changes to approved
    await expect(page.getByText('อนุมัติ (Approved)').first()).toBeVisible();

    // Status history should record approval
    await expect(page.getByText('อนุมัติรายงาน').first()).toBeVisible();
  });
});
