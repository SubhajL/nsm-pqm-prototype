import { expect, test } from '@playwright/test';

async function loginAs(page: import('@playwright/test').Page, userId: string) {
  await page.goto('/login');
  await page.locator(`input[type="radio"][value="${userId}"]`).check();
  await page.getByRole('button', { name: 'เข้าสู่ระบบ' }).click();
  await page.waitForURL('**/dashboard');
}

test.describe('project issue navigation', () => {
  test('routes issue items to the relevant project pages', async ({ page }) => {
    await loginAs(page, 'user-001');

    await page.goto('/projects/proj-002/issues');
    await page.getByText('NCR: ตรวจ session timeout', { exact: true }).click();
    await expect(page).toHaveURL(/\/projects\/proj-002\/quality\/inspection\/insp-proj-002-1$/);

    await page.goto('/projects/proj-002/issues');
    await page
      .getByText('Risk Mitigation: ผู้ให้บริการ SSO เปลี่ยน endpoint ช่วงใกล้ go-live', {
        exact: true,
      })
      .click();
    await expect(page).toHaveURL(/\/projects\/proj-002\/risk$/);

    await page.goto('/projects/proj-001/issues');
    await page.getByText('ท่อประปาเก่าขวางการขุด', { exact: true }).click();
    await expect(page).toHaveURL(/\/projects\/proj-001\/wbs$/);

    await page.goto('/projects/proj-001/issues');
    await page.getByText('ISS-001: รอยร้าวบนเสา C3', { exact: true }).click();
    await expect(page).toHaveURL(/\/projects\/proj-001\/wbs$/);
  });
});
