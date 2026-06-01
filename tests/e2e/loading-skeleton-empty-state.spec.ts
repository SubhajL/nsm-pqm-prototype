import { expect, test } from '@playwright/test';

/**
 * PR-B3 — covers the A3 primitive adoption.
 *
 * Two guarantees this spec encodes:
 *
 * 1. LoadingSkeleton renders `role="status"` + bilingual aria-label while a
 *    React-Query fetch is in flight. We pick the WBS page because it has the
 *    cleanest "loading branch returns early" shape post-PR-B3.
 *
 * 2. EmptyState replaces the default AntD blank space when a data screen has
 *    no rows. We exercise the documents page's "ไม่มีเอกสาร" copy after
 *    creating a fresh empty folder.
 */

async function loginAs(page: import('@playwright/test').Page, userId: string) {
  await page.goto('/login');
  await page.locator(`input[type="radio"][value="${userId}"]`).check();
  await page.getByRole('button', { name: 'เข้าสู่ระบบ' }).click();
  await page.waitForURL('**/dashboard');
}

test.describe('PR-B3 loading + empty primitives', () => {
  test('WBS page announces loading state with bilingual aria-label', async ({ page }) => {
    // Intercept the WBS API and delay the response so the loading branch is
    // observable. Without the delay the fetch may resolve before Playwright
    // can latch onto the role="status" node.
    await page.route('**/api/wbs/proj-001', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 800));
      await route.continue();
    });

    await loginAs(page, 'user-002');

    const wbsNavigation = page.goto('/projects/proj-001/wbs');

    // The LoadingSkeleton primitive wraps its content in role="status" with
    // an aria-label of "กำลังโหลด… (Loading…)". Both tokens must appear.
    const status = page.locator('[role="status"][aria-label*="กำลังโหลด"]').first();
    await expect(status).toBeVisible();
    await expect(status).toHaveAttribute('aria-busy', 'true');
    await expect(status).toHaveAttribute('aria-label', /Loading/);

    await wbsNavigation;
  });

  test('empty folder shows EmptyState bilingual copy in documents library', async ({ page }) => {
    const folderName = `โฟลเดอร์ว่าง ${Date.now()}`;

    await loginAs(page, 'user-002');
    await page.goto('/projects/proj-001/documents');

    // Wait for the documents page to settle (loading skeleton gone).
    await expect(page.getByRole('button', { name: 'สร้างโฟลเดอร์' })).toBeEnabled();

    // Create a fresh empty folder so the file table renders the empty branch.
    await page.getByRole('button', { name: 'สร้างโฟลเดอร์' }).click();
    const folderDialog = page.getByRole('dialog', { name: 'สร้างโฟลเดอร์' });
    await folderDialog.getByRole('textbox', { name: 'ชื่อโฟลเดอร์' }).fill(folderName);
    await folderDialog.getByRole('button', { name: 'บันทึก', exact: true }).click();

    // The bilingual EmptyState title from FilesTablePanel must render.
    await expect(
      page.getByText('ไม่มีเอกสารในโฟลเดอร์นี้ (No documents in this folder)'),
    ).toBeVisible();
  });
});
