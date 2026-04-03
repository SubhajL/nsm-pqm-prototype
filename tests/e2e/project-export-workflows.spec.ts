import { expect, test } from '@playwright/test';

async function loginAs(page: import('@playwright/test').Page, userId: string) {
  await page.goto('/login');
  await page.locator(`input[type="radio"][value="${userId}"]`).check();
  await page.getByRole('button', { name: 'เข้าสู่ระบบ' }).click();
  await page.waitForURL('**/dashboard');
}

test.describe('export workflows', () => {
  test('opens executive printable export', async ({ page }) => {
    await loginAs(page, 'user-001');
    await page.goto('/executive');

    const popupPromise = page.waitForEvent('popup');
    await page.getByRole('button', { name: /สร้างรายงาน PDF/i }).click();
    const popup = await popupPromise;

    await popup.waitForLoadState('domcontentloaded');
    await expect(popup.locator('body')).toContainText('Executive Dashboard');
  });

  test('downloads wbs excel export', async ({ page }) => {
    await loginAs(page, 'user-001');
    await page.goto('/projects/proj-001/wbs');

    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Export Excel' }).click();
    const download = await downloadPromise;

    expect(download.suggestedFilename()).toContain('wbs');
  });

  test('opens gantt printable export', async ({ page }) => {
    await loginAs(page, 'user-001');
    await page.goto('/projects/proj-001/gantt');

    const popupPromise = page.waitForEvent('popup');
    await page.getByRole('button', { name: 'Export PDF' }).click();
    const popup = await popupPromise;

    await popup.waitForLoadState('domcontentloaded');
    await expect(popup.locator('body')).toContainText('Gantt');
  });

  test('exports evm in both formats', async ({ page }) => {
    await loginAs(page, 'user-001');
    await page.goto('/projects/proj-001/s-curve');

    const pdfPopupPromise = page.waitForEvent('popup');
    await page.getByRole('button', { name: 'Export PDF' }).click();
    const pdfPopup = await pdfPopupPromise;
    await pdfPopup.waitForLoadState('domcontentloaded');
    await expect(pdfPopup.locator('body')).toContainText('EVM');

    await page.bringToFront();

    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Export Excel' }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toContain('evm');
  });

  test('exports risk register in both formats', async ({ page }) => {
    await loginAs(page, 'user-001');
    await page.goto('/projects/proj-001/risk');

    const pdfPopupPromise = page.waitForEvent('popup');
    await page.getByRole('button', { name: 'Export PDF' }).click();
    const pdfPopup = await pdfPopupPromise;
    await pdfPopup.waitForLoadState('domcontentloaded');
    await expect(pdfPopup.locator('body')).toContainText('Risk');

    await page.bringToFront();

    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Export Excel' }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toContain('risk');
  });

  test('downloads admin roster export', async ({ page }) => {
    await loginAs(page, 'user-001');
    await page.goto('/admin');

    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Export รายชื่อ' }).click();
    const download = await downloadPromise;

    expect(download.suggestedFilename()).toContain('users');
  });
});
