import { expect, test } from '@playwright/test';

async function loginAs(page: import('@playwright/test').Page, userId: string) {
  await page.goto('/login');
  await page.locator(`input[type="radio"][value="${userId}"]`).check();
  await page.getByRole('button', { name: 'เข้าสู่ระบบ' }).click();
  await page.waitForURL('**/dashboard');
}

test.describe('project gantt CRUD', () => {
  test('PM can add, edit, and delete gantt task', async ({ page }) => {
    const taskName = `งาน Gantt E2E ${Date.now()}`;
    const editedTaskName = `${taskName} แก้ไข`;

    await loginAs(page, 'user-002');
    await page.goto('/projects/proj-001/gantt');
    await expect(page.getByRole('heading', { name: /แผนภูมิแกนต์/i })).toBeVisible();

    await page.getByRole('button', { name: /เพิ่มงาน/i }).click();
    const createDialog = page.getByRole('dialog', { name: 'เพิ่มงานในแผน Gantt' });
    await createDialog.getByRole('textbox', { name: /ชื่อกิจกรรม/i }).fill(taskName);
    await createDialog.getByRole('textbox', { name: /ผู้รับผิดชอบ/i }).fill('น.ส.วิภา ขจรศักดิ์');
    await createDialog.getByPlaceholder('เลือกวันเริ่มต้น').fill('01/08/2026');
    await createDialog.getByPlaceholder('เลือกวันสิ้นสุด').fill('15/08/2026');
    await createDialog.getByRole('button', { name: 'บันทึก', exact: true }).click();
    await expect(page.getByText(taskName)).toBeVisible();

    await page.getByRole('button', { name: new RegExp(`แก้ไข ${taskName}`) }).click();
    const editDialog = page.getByRole('dialog', { name: 'แก้ไขงานในแผน Gantt' });
    await editDialog.getByRole('textbox', { name: /ชื่อกิจกรรม/i }).fill(editedTaskName);
    await editDialog.getByRole('spinbutton', { name: /% ความคืบหน้า/i }).fill('55');
    await editDialog.getByRole('button', { name: 'บันทึก', exact: true }).click();
    await expect(page.getByText(editedTaskName)).toBeVisible();
    await expect(page.getByText('55%')).toBeVisible();

    await page.getByRole('button', { name: new RegExp(`ลบ ${editedTaskName}`) }).click();
    await page.getByRole('button', { name: 'ลบ', exact: true }).click();
    await expect(page.getByText(editedTaskName)).toHaveCount(0);
  });

  test('Coordinator can add and delete gantt task', async ({ page }) => {
    const taskName = `งานประสานงาน ${Date.now()}`;

    await loginAs(page, 'user-004');
    await page.goto('/projects/proj-001/gantt');
    await expect(page.getByRole('button', { name: /เพิ่มงาน/i })).toBeVisible();

    await page.getByRole('button', { name: /เพิ่มงาน/i }).click();
    const dialog = page.getByRole('dialog', { name: 'เพิ่มงานในแผน Gantt' });
    await dialog.getByRole('textbox', { name: /ชื่อกิจกรรม/i }).fill(taskName);
    await dialog.getByRole('textbox', { name: /ผู้รับผิดชอบ/i }).fill('น.ส.พิมพ์ลดา งามวงศ์');
    await dialog.getByPlaceholder('เลือกวันเริ่มต้น').fill('05/08/2026');
    await dialog.getByPlaceholder('เลือกวันสิ้นสุด').fill('07/08/2026');
    await dialog.getByRole('button', { name: 'บันทึก', exact: true }).click();
    await expect(page.getByText(taskName)).toBeVisible();

    await page.getByRole('button', { name: new RegExp(`ลบ ${taskName}`) }).click();
    await page.getByRole('button', { name: 'ลบ', exact: true }).click();
    await expect(page.getByText(taskName)).toHaveCount(0);
  });

  test('Engineer sees gantt as read only', async ({ page }) => {
    await loginAs(page, 'user-003');
    await page.goto('/projects/proj-001/gantt');
    await expect(page.getByRole('heading', { name: /แผนภูมิแกนต์/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /เพิ่มงาน/i })).toHaveCount(0);
  });

  test('project-specific timeline and task schedule status stay aligned with edits', async ({ page }) => {
    await loginAs(page, 'user-006');
    await page.goto('/projects/proj-002/gantt');

    await expect(page.getByText('ม.ค. 69').first()).toBeVisible();
    await expect(page.getByText('ส.ค. 69').first()).toBeVisible();

    const analysisPhaseRow = page.locator('tr').filter({
      has: page.getByText('วิเคราะห์ความต้องการ'),
    });
    await expect(analysisPhaseRow.getByText('กำลังดำเนินการ (In Progress)')).toBeVisible();
    await expect(analysisPhaseRow.getByText('เสร็จสิ้น (Complete)')).toHaveCount(0);

    const taskRow = page.locator('tr').filter({
      has: page.getByText('พัฒนา Booking API และฐานข้อมูล'),
    });
    await expect(taskRow.getByText('ล่าช้า (Delayed)')).toBeVisible();

    await page.getByRole('button', { name: /แก้ไข พัฒนา Booking API และฐานข้อมูล/i }).click();
    const editDialog = page.getByRole('dialog', { name: 'แก้ไขงานในแผน Gantt' });
    await expect(editDialog.locator('input[value="06/02/2026"]')).toBeVisible();
    await expect(editDialog.locator('input[value="13/03/2026"]')).toBeVisible();
    await editDialog.getByRole('spinbutton', { name: /% ความคืบหน้า/i }).fill('100');
    await editDialog.getByRole('button', { name: 'บันทึก', exact: true }).click();

    await expect(taskRow.getByText('เสร็จสิ้น (Complete)')).toBeVisible();
    await expect(taskRow.getByText('ล่าช้า (Delayed)')).toHaveCount(0);
  });
});
