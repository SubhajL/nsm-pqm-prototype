import { expect, test } from '@playwright/test';

async function loginAs(page: import('@playwright/test').Page, userId: string) {
  await page.goto('/login');
  await page.locator(`input[type="radio"][value="${userId}"]`).check();
  await page.getByRole('button', { name: 'เข้าสู่ระบบ' }).click();
  await page.waitForURL('**/dashboard');
}

async function logout(page: import('@playwright/test').Page) {
  await page.getByRole('button', { name: /ออกจากระบบ/i }).click();
  await page.waitForURL('**/login');
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
    .getByText(optionText, { exact: false })
    .first()
    .click();
}

async function selectDropdownOptionByAriaLabel(
  page: import('@playwright/test').Page,
  ariaLabel: string,
  optionText: string,
) {
  const input = page.getByRole('combobox', { name: ariaLabel });
  await input.focus();
  await input.press('ArrowDown');
  await page
    .locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden)')
    .getByText(optionText, { exact: false })
    .first()
    .click();
}

test.describe('batch 3 workflow depth: daily report history and gantt dependency semantics', () => {
  test('daily reports support draft -> submitted -> approved workflow with visible history', async ({
    page,
  }) => {
    const issueText = `ติดตามสถานะรายงาน ${Date.now()}`;

    await loginAs(page, 'user-006');
    await page.goto('/projects/proj-002/daily-report');

    await page.getByRole('button', { name: /สร้างรายงานใหม่/i }).click();
    const reportDialog = page.getByRole('dialog', { name: 'สร้างรายงานประจำวัน' });
    await reportDialog.getByRole('textbox', { name: 'วันที่' }).fill('19/03/2026');
    await reportDialog.getByRole('textbox', { name: 'สภาพอากาศ' }).fill('แดดจัด (Sunny)');
    await reportDialog.getByRole('spinbutton', { name: 'อุณหภูมิ' }).fill('32');
    await reportDialog.getByRole('button', { name: 'เพิ่มบุคลากร' }).click();
    await reportDialog.getByRole('textbox', { name: 'ประเภทบุคลากร 1' }).fill('นักพัฒนาระบบ');
    await reportDialog.getByRole('spinbutton', { name: 'จำนวนบุคลากร 1' }).fill('3');
    await reportDialog.getByRole('button', { name: 'เพิ่มกิจกรรม' }).click();
    await reportDialog.getByRole('textbox', { name: 'ชื่อกิจกรรม 1' }).fill('พัฒนา service integration');
    await reportDialog.getByRole('spinbutton', { name: 'ปริมาณงาน 1' }).fill('5');
    await reportDialog.getByRole('textbox', { name: 'หน่วยงานกิจกรรม 1' }).fill('endpoint');
    await reportDialog.getByRole('spinbutton', { name: 'ความก้าวหน้าสะสม 1' }).fill('40');
    await reportDialog.getByRole('textbox', { name: 'ผู้จัดทำรายงาน' }).fill('น.ส.สมศรี วรรณดี');
    await reportDialog.getByRole('textbox', { name: 'ผู้ตรวจสอบ' }).fill('นายสมชาย กิตติพงษ์');
    await reportDialog.getByRole('textbox', { name: 'ปัญหา/อุปสรรค' }).fill(issueText);
    await reportDialog.getByRole('button', { name: 'บันทึก', exact: true }).click();

    await expect(page.getByText(issueText)).toBeVisible();
    await expect(page.getByText('ร่าง (Draft)')).toBeVisible();
    await page.getByRole('button', { name: /ส่งอนุมัติ/i }).click();
    await expect(page.getByText('ส่งแล้ว (Submitted)')).toBeVisible();
    await expect(page.getByText('ประวัติสถานะรายงาน')).toBeVisible();
    await expect(page.getByText('ร่าง (Draft)', { exact: false }).first()).toBeVisible();
    await expect(page.getByText('ส่งแล้ว (Submitted)', { exact: false }).first()).toBeVisible();

    const createdReport = await page.evaluate(async (currentIssueText) => {
      const response = await fetch('/api/daily-reports?projectId=proj-002');
      const payload = await response.json();
      return payload.data.find((entry: { issues: string }) => entry.issues === currentIssueText);
    }, issueText);

    expect(createdReport?.reportNumber).toBeTruthy();

    await logout(page);

    await loginAs(page, 'user-001');
    await page.goto('/projects/proj-002/daily-report');
    await page.getByPlaceholder('ค้นหาจากเลขที่รายงาน, ปัญหา, ผู้จัดทำ').fill(String(createdReport.reportNumber));
    await selectDropdownOptionByAriaLabel(page, 'สถานะรายงาน', 'ส่งแล้ว (Submitted)');
    await page.getByText(String(createdReport.reportNumber), { exact: true }).click();
    await page.getByRole('button', { name: /อนุมัติรายงาน/i }).click();

    await expect(page.getByText('อนุมัติ (Approved)')).toBeVisible();
    await expect(page.getByText('อนุมัติ (Approved)', { exact: false })).toBeVisible();
    await expect(
      page.getByRole('main').getByText('นายสมชาย กิตติพงษ์', { exact: false }),
    ).toBeVisible();
  });

  test('gantt dependencies support link type and lag with visible persisted labels', async ({
    page,
  }) => {
    await loginAs(page, 'user-006');
    await page.goto('/projects/proj-002/gantt');

    await page.getByRole('button', { name: 'แก้ไข พัฒนา Frontend และ Dashboard' }).click();
    const ganttDialog = page.getByRole('dialog', { name: 'แก้ไขงานในแผน Gantt' });

    await selectDropdownOptionByAriaLabel(page, 'งานก่อนหน้า 1', 'พัฒนา Booking API และฐานข้อมูล');
    await selectDropdownOptionByAriaLabel(page, 'ประเภทความสัมพันธ์ 1', 'SS (Start-to-Start)');
    await ganttDialog.getByRole('spinbutton', { name: 'Lag 1' }).fill('3');
    await ganttDialog.getByRole('button', { name: 'บันทึก', exact: true }).click();

    const targetRow = page.getByRole('row', { name: /พัฒนา Frontend และ Dashboard/i });
    await expect(targetRow).toContainText('พัฒนา Booking API และฐานข้อมูล');
    await expect(targetRow).toContainText('SS +3 วัน');

    const linkPayload = await page.evaluate(async () => {
      const response = await fetch('/api/gantt/proj-002');
      const payload = await response.json();
      const taskByText = new Map(
        payload.data.data.map((task: { id: number; text: string }) => [task.text, task.id]),
      );
      const targetId = taskByText.get('พัฒนา Frontend และ Dashboard');
      const sourceId = taskByText.get('พัฒนา Booking API และฐานข้อมูล');
      return payload.data.links.find(
        (link: { target: number; source: number }) =>
          link.target === targetId && link.source === sourceId,
      );
    });

    expect(linkPayload?.type).toBe('SS');
    expect(linkPayload?.lagDays).toBe(3);
  });
});
