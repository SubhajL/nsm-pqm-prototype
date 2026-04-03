import { expect, test } from '@playwright/test';

async function loginAs(page: import('@playwright/test').Page, userId: string) {
  await page.goto('/login');
  await page.locator(`input[type="radio"][value="${userId}"]`).check();
  await page.getByRole('button', { name: 'เข้าสู่ระบบ' }).click();
  await page.waitForURL('**/dashboard');
}

async function selectOptionByFormLabel(
  page: import('@playwright/test').Page,
  label: string,
  optionText: string,
) {
  const field = page.locator('.ant-form-item').filter({ hasText: label }).first();
  await field.locator('.ant-select-selector').click();
  await page.locator('.ant-select-dropdown').getByText(optionText, { exact: false }).click();
}

test.describe('project EVM and quality write flows', () => {
  test('admin can add and delete EVM snapshots and quality inspections', async ({ page }) => {
    await loginAs(page, 'user-001');

    const projectName = `EVM Internal ${Date.now()}`;

    await page.getByRole('button', { name: /สร้างโครงการใหม่/i }).click();
    await page.waitForURL('**/projects/new');
    await page.getByPlaceholder('ระบุชื่อโครงการ').fill(projectName);
    await selectOptionByFormLabel(
      page,
      'ประเภทโครงการ (Project Type)',
      'พัฒนาระบบ IT',
    );
    await selectOptionByFormLabel(
      page,
      'รูปแบบการดำเนินโครงการ (Execution Model)',
      'โครงการภายใน',
    );
    await page.getByPlaceholder('ระบุวัตถุประสงค์ของโครงการ').fill('EVM CRUD validation');
    await page.getByPlaceholder('ระบุรายละเอียดเพิ่มเติม (ถ้ามี)').fill('Created by Playwright');
    await page.getByPlaceholder('เลือกวันที่เริ่มต้น').fill('01/06/2026');
    await page.getByPlaceholder('เลือกวันที่สิ้นสุด').fill('31/12/2026');
    await selectOptionByFormLabel(
      page,
      'วิธีคำนวณ Progress (Progress Calculation Method)',
      'Weighting Method',
    );
    await page.getByRole('button', { name: /สร้างโครงการ \(Create Project\)/i }).click();
    await expect(page).toHaveURL(/\/projects\/[0-9a-f-]{36}$/);

    const projectId = page.url().split('/projects/')[1];

    await page.goto(`/projects/${projectId}/s-curve`);
    await expect(page.getByRole('heading', { name: /EVM Dashboard/i })).toBeVisible();
    await page.getByRole('button', { name: /บันทึกงวด EVM ใหม่/i }).click();

    const evmDialog = page.getByRole('dialog', { name: 'บันทึกงวด EVM ใหม่' });
    await evmDialog.getByPlaceholder('เลือกเดือน').fill('08/2026');
    await evmDialog.getByRole('spinbutton', { name: /PV/i }).fill('9500000');
    await evmDialog.getByRole('spinbutton', { name: /EV/i }).fill('9000000');
    await evmDialog.getByRole('spinbutton', { name: /AC/i }).fill('8700000');
    await evmDialog.getByRole('button', { name: 'บันทึก', exact: true }).click();
    await expect(page.getByRole('cell', { name: 'ส.ค. 69', exact: true })).toBeVisible();

    await page.getByRole('button', { name: /ลบงวด EVM ส.ค. 69/i }).click();
    await page.getByRole('button', { name: 'ลบ', exact: true }).click();
    await expect(page.getByText('ส.ค. 69')).toHaveCount(0);

    await page.goto('/projects/proj-001/quality');
    await expect(page.getByRole('heading', { name: /การควบคุมคุณภาพ/i })).toBeVisible();
    await page.getByRole('button', { name: /บันทึกผลตรวจใหม่/i }).click();

    const inspectionDialog = page.getByRole('dialog', { name: 'บันทึกผลตรวจคุณภาพใหม่' });
    await inspectionDialog.getByRole('textbox', { name: /หัวข้อการตรวจ/i }).fill('ITP E2E Inspection');
    await inspectionDialog.getByRole('combobox', { name: /รายการ ITP/i }).click();
    await page.locator('.ant-select-dropdown').getByText('ทดสอบกำลังอัด (7/28 วัน)', { exact: false }).click();
    await inspectionDialog.getByPlaceholder('เลือกวันที่ตรวจ').fill('16/03/2026');
    await inspectionDialog.getByPlaceholder('HH:mm').fill('10:30');
    await inspectionDialog.getByRole('textbox', { name: /ผู้ตรวจสอบ/i }).fill('น.ส.วิภา ขจรศักดิ์, นายประสิทธิ์ มั่นคง');
    await inspectionDialog.getByRole('textbox', { name: /WBS อ้างอิง/i }).fill('WBS 2.4 ทดสอบคอนกรีต');
    await inspectionDialog.getByRole('textbox', { name: /มาตรฐานอ้างอิง/i }).fill('มอก.213, ASTM C39');
    await inspectionDialog.getByRole('button', { name: 'บันทึก', exact: true }).click();
    await expect(page.getByText('ITP E2E Inspection')).toBeVisible();

    await page.getByRole('button', { name: /ลบผลตรวจ ITP E2E Inspection/i }).click();
    await page.getByRole('button', { name: 'ลบ', exact: true }).click();
    await expect(page.getByText('ITP E2E Inspection')).toHaveCount(0);
  });
});
