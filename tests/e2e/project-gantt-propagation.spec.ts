import { expect, test } from '@playwright/test';

async function loginAs(page: import('@playwright/test').Page, userId: string) {
  await page.goto('/login');
  await page.locator(`input[type="radio"][value="${userId}"]`).check();
  await page.getByRole('button', { name: 'เข้าสู่ระบบ' }).click();
  await page.waitForURL('**/dashboard');
}

test.describe('gantt progress propagation', () => {
  test('editing seeded gantt tasks updates WBS, project summary, progress page, and dashboard schedule health', async ({
    page,
  }) => {
    await loginAs(page, 'user-002');

    await page.goto('/projects/proj-001/gantt');
    for (const taskName of ['ออกแบบเบื้องต้น', 'จัดทำ BOQ', 'งานรื้อถอน', 'งานโครงสร้าง']) {
      await page.getByRole('button', { name: new RegExp(`แก้ไข ${taskName}`) }).click();
      const dialog = page.getByRole('dialog', { name: 'แก้ไขงานในแผน Gantt' });
      await dialog.getByRole('spinbutton', { name: /% ความคืบหน้า/i }).fill('100');
      await dialog.getByRole('button', { name: 'บันทึก', exact: true }).click();
    }

    await expect(page.getByText('100%')).toHaveCount(5);

    const projectResponse = await page.evaluate(async () => {
      const response = await fetch('/api/projects/proj-001');
      return response.json();
    });

    expect(projectResponse.data.progress).toBeGreaterThan(0.68);
    expect(projectResponse.data.progress).toBeLessThan(0.70);
    expect(projectResponse.data.status).toBe('in_progress');
    expect(projectResponse.data.scheduleHealth).toBe('on_schedule');

    await page.goto('/projects/proj-001/wbs');
    await expect(page.getByText('BOQ — 2.1 งานรื้อถอน')).toBeVisible();
    await expect(page.getByText('100%').first()).toBeVisible();

    await page.goto('/projects/proj-001/progress');
    await expect(page.getByText('69.00%').first()).toBeVisible();

    await page.goto('/dashboard');
    const projectRow = page.locator('tr').filter({
      has: page.getByRole('link', { name: 'โครงการปรับปรุงนิทรรศการดาราศาสตร์' }),
    });
    await expect(projectRow.getByText('ตามแผน (On Schedule)')).toBeVisible();
  });
});
