import { expect, test } from '@playwright/test';

async function loginAs(page: import('@playwright/test').Page, userId: string) {
  await page.goto('/login');
  await page.locator(`input[type="radio"][value="${userId}"]`).check();
  await page.getByRole('button', { name: 'เข้าสู่ระบบ' }).click();
  await page.waitForURL('**/dashboard');
}

test.describe('project EVM metric consistency', () => {
  test('proj-002 shows consistent latest-snapshot metrics and signs', async ({ page }) => {
    await loginAs(page, 'user-001');

    await page.goto('/projects/proj-002/s-curve');
    await expect(page.getByRole('heading', { name: /EVM Dashboard/i })).toBeVisible();

    await expect(page.getByText('ข้อมูลล่าสุด ณ งวด มิ.ย. 69')).toBeVisible();
    await expect(page.getByText('0.95').first()).toBeVisible();
    await expect(page.getByText('0.98').first()).toBeVisible();
    await expect(page.getByText('-63K฿')).toBeVisible();
    await expect(page.getByText('เริ่มเกินงบ (Slightly Over Budget)')).toBeVisible();
    await expect(page.getByText('-45,000 ฿')).toBeVisible();
    await expect(page.getByText('-63,158 ฿')).toBeVisible();
    await expect(page.getByText('Schedule Variance: -5.0%')).toBeVisible();
    await expect(page.getByText('Cost Variance: -1.9%')).toBeVisible();
  });
});
