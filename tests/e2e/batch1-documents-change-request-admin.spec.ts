import { expect, test } from '@playwright/test';

async function loginAs(page: import('@playwright/test').Page, userId: string) {
  await page.goto('/login');
  await page.locator(`input[type="radio"][value="${userId}"]`).check();
  await page.getByRole('button', { name: 'เข้าสู่ระบบ' }).click();
  await page.waitForURL('**/dashboard');
}

async function selectAntOption(
  page: import('@playwright/test').Page,
  fieldLabel: string,
  optionText: string,
) {
  const field = page.locator('.ant-form-item').filter({ hasText: fieldLabel }).first();
  await field.locator('.ant-select-selector').click();
  await page
    .locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden)')
    .locator('.ant-select-item-option-content')
    .filter({ hasText: optionText })
    .first()
    .click();
}

test.describe('batch 1 gaps: documents, change requests, and admin writes', () => {
  test('PM can create a folder and upload a project document', async ({ page }) => {
    const folderName = `เอกสารทดสอบ ${Date.now()}`;
    const fileName = `แบบตรวจสอบ ${Date.now()}.pdf`;

    await loginAs(page, 'user-002');
    await page.goto('/projects/proj-001/documents');

    await page.getByRole('button', { name: 'สร้างโฟลเดอร์' }).click();
    const folderDialog = page.getByRole('dialog', { name: 'สร้างโฟลเดอร์' });
    await folderDialog.getByRole('textbox', { name: 'ชื่อโฟลเดอร์' }).fill(folderName);
    await folderDialog.getByRole('button', { name: 'บันทึก', exact: true }).click();

    await page.getByRole('button', { name: /อัปโหลดเอกสาร/i }).click();
    const uploadDialog = page.getByRole('dialog', { name: 'อัปโหลดเอกสาร' });
    await uploadDialog.getByRole('textbox', { name: 'ชื่อไฟล์' }).fill(fileName);
    await selectAntOption(page, 'โฟลเดอร์ปลายทาง', folderName);
    await uploadDialog.getByRole('textbox', { name: 'ประเภทเอกสาร' }).fill('Shop Drawing');
    await uploadDialog.getByRole('textbox', { name: 'ขนาดไฟล์' }).fill('2.4 MB');
    await uploadDialog.getByRole('button', { name: 'บันทึก', exact: true }).click();

    await expect(page.locator('tbody').getByText(fileName, { exact: true })).toBeVisible();
  });

  test('PM can create a change request and system admin can approve it', async ({ page }) => {
    const title = `เพิ่มขอบเขตงานทดสอบ ${Date.now()}`;

    await loginAs(page, 'user-002');
    await page.goto('/projects/proj-001/change-request');

    await page.getByRole('button', { name: 'สร้าง Change Request' }).click();
    const createDialog = page.getByRole('dialog', { name: 'สร้าง Change Request' });
    await createDialog.getByRole('textbox', { name: 'หัวข้อ' }).fill(title);
    await createDialog.getByRole('textbox', { name: 'เหตุผล' }).fill('สร้างจาก Playwright');
    await createDialog.getByRole('textbox', { name: 'เชื่อมโยง WBS' }).fill('WBS 3.2 งานระบบมัลติมีเดีย');
    await createDialog.getByRole('spinbutton', { name: 'ผลกระทบงบประมาณ' }).fill('125000');
    await createDialog.getByRole('spinbutton', { name: 'ผลกระทบเวลา' }).fill('4');
    await selectAntOption(page, 'ระดับความสำคัญ', 'ปานกลาง');
    await createDialog.getByRole('button', { name: 'บันทึก', exact: true }).click();

    await page.getByRole('button', { name: /ออกจากระบบ/i }).click();
    await page.waitForURL('**/login');

    await loginAs(page, 'user-001');
    await page.goto('/projects/proj-001/change-request');
    await page.locator(`tbody td[title="${title}"]`).click();
    await page.getByRole('button', { name: 'อนุมัติ (Approve)' }).click();

    await expect(
      page.locator(`tbody td[title="${title}"]`).locator('xpath=ancestor::tr[1]'),
    ).toContainText('อนุมัติ');
  });

  test('system admin can add an org unit, add a user, and suspend that user', async ({ page }) => {
    const unitName = `กองทดสอบ ${Date.now()}`;
    const userName = `ผู้ใช้ทดสอบ ${Date.now()}`;
    const email = `qa-${Date.now()}@nsm.or.th`;

    await loginAs(page, 'user-001');
    await page.goto('/admin');

    await page.getByRole('button', { name: /\+ เพิ่มหน่วยงาน/i }).click();
    const unitDialog = page.getByRole('dialog', { name: 'เพิ่มหน่วยงาน' });
    await unitDialog.getByRole('textbox', { name: 'ชื่อหน่วยงาน' }).fill(unitName);
    await unitDialog.getByRole('textbox', { name: 'ชื่อภาษาอังกฤษ' }).fill('QA Unit');
    await selectAntOption(page, 'หน่วยงานแม่', 'อพวช.');
    await unitDialog.getByRole('button', { name: 'บันทึก', exact: true }).click();

    await expect(page.getByRole('tree').getByText(unitName, { exact: true })).toBeVisible();

    await page.getByRole('button', { name: /\+ เพิ่มผู้ใช้งาน/i }).click();
    const userDialog = page.getByRole('dialog', { name: 'เพิ่มผู้ใช้งาน' });
    await userDialog.getByRole('textbox', { name: 'ชื่อ-สกุล' }).fill(userName);
    await userDialog.getByRole('textbox', { name: 'ตำแหน่ง' }).fill('เจ้าหน้าที่ทดสอบ');
    await selectAntOption(page, 'บทบาทในระบบ', 'Coordinator');
    await selectAntOption(page, 'สังกัดหน่วยงาน', unitName);
    await userDialog.getByRole('textbox', { name: 'อีเมล' }).fill(email);
    await userDialog.getByRole('textbox', { name: 'เบอร์โทร' }).fill('099-123-4567');
    await userDialog.getByRole('button', { name: 'บันทึก', exact: true }).click();

    await expect(page.locator('tbody').getByText(userName, { exact: true })).toBeVisible();
    await page.getByRole('row', { name: new RegExp(userName) }).getByRole('button', { name: 'Suspend' }).click();
    await expect(page.getByRole('row', { name: new RegExp(userName) })).toContainText('Suspended');
  });
});
