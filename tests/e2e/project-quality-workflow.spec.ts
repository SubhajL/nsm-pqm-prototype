import { expect, test } from '@playwright/test';

async function loginAs(page: import('@playwright/test').Page, userId: string) {
  await page.goto('/login');
  await page.locator(`input[type="radio"][value="${userId}"]`).check();
  await page.getByRole('button', { name: 'เข้าสู่ระบบ' }).click();
  await page.waitForURL('**/dashboard');
}

test.describe('quality checklist links to inspection detail (proj-001)', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'user-002');
    await page.goto('/projects/proj-001/quality');
    await expect(page.getByRole('heading', { name: /คุณภาพ/i })).toBeVisible();
  });

  test('ITP item with inspection record is clickable and navigates to detail', async ({ page }) => {
    // ITP item "เทคอนกรีต" (itp-3) has an inspection record (insp-001)
    const itpLink = page.getByRole('button', { name: 'เทคอนกรีต', exact: true });
    await expect(itpLink).toBeVisible();
    await itpLink.click();

    // Should navigate to the inspection detail page
    await expect(page.getByRole('heading', { name: /แบบฟอร์มตรวจสอบคุณภาพ/i })).toBeVisible();
    await expect(page.getByText('ITP #3 — เทคอนกรีต ฐานราก F3-F6')).toBeVisible();
  });

  test('ITP item without inspection record is plain text (not clickable)', async ({ page }) => {
    // ITP item "ถอดแบบหล่อ" (itp-5) has no inspection record
    // It should be plain text, not a link button
    const plainText = page.locator('td').filter({ hasText: 'ถอดแบบหล่อ' });
    await expect(plainText).toBeVisible();

    // Should NOT have a link button for this item
    const linkButton = page.getByRole('button', { name: 'ถอดแบบหล่อ' });
    await expect(linkButton).toHaveCount(0);
  });
});

test.describe('inspection workflow buttons (proj-001)', () => {
  test('fail items block ยืนยัน and ลงนาม buttons', async ({ page }) => {
    await loginAs(page, 'user-002');
    await page.goto('/projects/proj-001/quality/inspection/insp-001');
    await expect(page.getByRole('heading', { name: /แบบฟอร์มตรวจสอบคุณภาพ/i })).toBeVisible();

    // Seed data has 1 fail item (อุณหภูมิคอนกรีต) → buttons should be blocked
    await expect(page.getByText(/ยังมี.*รายการที่ไม่ผ่าน/)).toBeVisible();

    // ยืนยันผลตรวจ should be disabled (has fail items)
    await expect(page.getByRole('button', { name: 'ยืนยันผลตรวจ' })).toBeDisabled();

    // ลงนามดิจิทัล should be disabled
    await expect(page.getByRole('button', { name: 'ลงนามดิจิทัล' })).toBeDisabled();

    // "แก้ไขเป็นผ่าน" button should be visible for the failed item
    await expect(page.getByRole('button', { name: 'แก้ไขเป็นผ่าน' })).toBeVisible();
  });

  test('engineer resolves fail item, then workflow buttons become enabled', async ({ page }) => {
    await loginAs(page, 'user-003'); // Engineer
    await page.goto('/projects/proj-001/quality/inspection/insp-001');
    await expect(page.getByRole('heading', { name: /แบบฟอร์มตรวจสอบคุณภาพ/i })).toBeVisible();

    // Click "แก้ไขเป็นผ่าน" to resolve the failed item
    await page.getByRole('button', { name: 'แก้ไขเป็นผ่าน' }).click();

    // Success toast
    await expect(page.getByText(/แก้ไข.*เป็นผ่านแล้ว/)).toBeVisible();

    // Fail blocking alert should disappear
    await expect(page.getByText(/ยังมี.*รายการที่ไม่ผ่าน/)).toHaveCount(0);

    // Overall result should change to ผ่าน (PASS)
    await expect(page.getByText('ผ่าน (PASS)').first()).toBeVisible();
  });
});

test.describe('quality workflow works on generated projects', () => {
  test('proj-002 quality page loads with ITP table and inspection records', async ({ page }) => {
    await loginAs(page, 'user-006');
    await page.goto('/projects/proj-002/quality');
    await expect(page.getByRole('heading', { name: /คุณภาพ/i })).toBeVisible();

    // ITP table should be visible with items
    await expect(page.getByText('Inspection Test Plan (ITP)')).toBeVisible();

    // Inspection records table should be visible
    await expect(page.getByText('Inspection Records')).toBeVisible();

    // Should have inspection record links (in the second table)
    const inspectionLinks = page.locator('table').nth(1).locator('.ant-btn-link');
    const count = await inspectionLinks.count();
    expect(count).toBeGreaterThan(0);
  });
});
