import { expect, test } from '@playwright/test';

async function loginAs(page: import('@playwright/test').Page, userId: string) {
  await page.goto('/login');
  await page.locator(`input[type="radio"][value="${userId}"]`).check();
  await page.getByRole('button', { name: 'เข้าสู่ระบบ' }).click();
  await page.waitForURL('**/dashboard');
}

test.describe('outsourced project EVM mode', () => {
  test('shows owner-side payment tracking instead of contractor-cost metrics', async ({ page }) => {
    await loginAs(page, 'user-001');

    await page.goto('/projects/proj-001/s-curve');

    await expect(page.getByRole('columnheader', { name: 'Paid to Date' })).toBeVisible();
    await expect(page.getByText('จ่ายแล้วสะสม')).toBeVisible();
    await expect(page.getByText('คงเหลือที่ต้องจ่าย')).toBeVisible();

    await expect(page.getByText('CPI (Cost Performance Index)')).toHaveCount(0);
    await expect(page.getByText('EAC (Estimate at Completion)')).toHaveCount(0);
    await expect(page.getByText('VAC (Variance at Completion)')).toHaveCount(0);
    await expect(page.getByText('TCPI = (BAC - EV) / (BAC - AC)')).toHaveCount(0);

    await expect(page.getByRole('columnheader', { name: 'PV' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'EV' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Paid to Date' })).toBeVisible();
  });
});
