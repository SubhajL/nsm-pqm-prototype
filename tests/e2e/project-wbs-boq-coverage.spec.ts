import { expect, test } from '@playwright/test';

async function loginAs(page: import('@playwright/test').Page, userId: string) {
  await page.goto('/login');
  await page.locator(`input[type="radio"][value="${userId}"]`).check();
  await page.getByRole('button', { name: 'เข้าสู่ระบบ' }).click();
  await page.waitForURL('**/dashboard');
}

test.describe('seeded WBS/BOQ coverage', () => {
  test('astronomy project opens with BOQ rows in read-only mode', async ({ page }) => {
    await loginAs(page, 'user-001');

    await page.goto('/projects/proj-001/wbs');

    await expect(page.getByRole('heading', { name: /WBS/ })).toBeVisible();
    await expect(page.getByText('BOQ — 2.1 งานรื้อถอน')).toBeVisible();
    await expect(page.getByText('รื้อผนังยิปซั่ม')).toBeVisible();
    await expect(page.getByText('ไม่มีรายการ BOQ สำหรับ WBS node นี้')).toHaveCount(0);
    await expect(page.getByText('BOQ สำหรับโครงการจ้างภายนอกเป็นแบบอ่านอย่างเดียว')).toBeVisible();
    await expect(page.getByRole('button', { name: /\+ เพิ่มรายการ BOQ/i })).toHaveCount(0);

    const createAttempt = await page.evaluate(async () => {
      const response = await fetch('/api/boq/wbs-2-1', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: 'Should be blocked',
          quantity: 1,
          unit: 'งาน',
          unitPrice: 1000,
        }),
      });

      return {
        status: response.status,
        body: await response.json(),
      };
    });

    expect(createAttempt.status).toBe(403);
    expect(createAttempt.body.error.message).toBe('BOQ สำหรับโครงการจ้างภายนอกเป็นแบบอ่านอย่างเดียว');
  });

  test('internal generated projects still default to an editable BOQ node', async ({ page }) => {
    await loginAs(page, 'user-001');

    await page.goto('/projects/proj-002/wbs');

    await expect(page.getByRole('heading', { name: /WBS/ })).toBeVisible();
    await expect(page.getByText('BOQ — 2.1 พัฒนา Booking API และฐานข้อมูล')).toBeVisible();
    await expect(page.getByText('ค่าพัฒนา Backend Module')).toBeVisible();
    await expect(page.getByText('ไม่มีรายการ BOQ สำหรับ WBS node นี้')).toHaveCount(0);
    await expect(page.getByRole('button', { name: /\+ เพิ่มรายการ BOQ/i })).toBeVisible();
  });
});
