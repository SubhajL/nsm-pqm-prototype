import { expect, test } from '@playwright/test';

async function loginAs(page: import('@playwright/test').Page, userId: string) {
  await page.goto('/login');
  await page.locator(`input[type="radio"][value="${userId}"]`).check();
  await page.getByRole('button', { name: 'เข้าสู่ระบบ' }).click();
  await page.waitForURL('**/dashboard');
}

test.describe('daily report mobile responsive', () => {
  test('daily report uses a mobile drawer shell and keeps the page usable on narrow screens', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await loginAs(page, 'user-002');

    await page.goto('/projects/proj-001/daily-report');
    await expect(page.getByRole('heading', { name: /รายงานประจำวัน/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /สร้างรายงานใหม่/i })).toBeVisible();

    await expect(page.locator('.ant-layout-sider')).toHaveCount(0);

    await page.getByRole('button', { name: 'เปิดเมนูนำทาง' }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByRole('dialog').getByText('โครงการ (Projects)')).toBeVisible();
  });
});
