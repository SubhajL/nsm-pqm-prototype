import { expect, test } from '@playwright/test';

async function loginAs(page: import('@playwright/test').Page, userId: string) {
  await page.goto('/login');
  await page.locator(`input[type="radio"][value="${userId}"]`).check();
  await page.getByRole('button', { name: 'เข้าสู่ระบบ' }).click();
  await page.waitForURL('**/dashboard');
}

test.describe('dashboard project table execution model column', () => {
  test('shows internal and outsourced project execution types in the table', async ({ page }) => {
    await loginAs(page, 'user-001');

    await page.goto('/dashboard');

    await expect(page.getByRole('columnheader', { name: /รูปแบบดำเนินงาน \(Execution\)/i })).toBeVisible();
    await expect(page.getByText('จ้างภายนอก').first()).toBeVisible();
    await expect(page.getByText('Outsourced Project').first()).toBeVisible();
    await expect(page.getByText('โครงการภายใน').first()).toBeVisible();
    await expect(page.getByText('Internal Project').first()).toBeVisible();
    await expect(page.getByText('Delayed').first()).toBeVisible();
    await expect(page.getByText('Watch').first()).toBeVisible();
  });
});
