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
  const option = page
    .locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden)')
    .last()
    .locator('.ant-select-item-option-content')
    .filter({ hasText: optionText })
    .first();
  await option.scrollIntoViewIfNeeded();
  await option.click();
}

test.describe('batch 2 consistency: users, daily reports, and gantt dependencies', () => {
  test('newly created active user appears on login screen and as a team invite candidate', async ({
    page,
  }) => {
    const unitName = `กองเชิญสมาชิก ${Date.now()}`;
    const userName = `ผู้ใช้เชิญทีม ${Date.now()}`;
    const email = `invite-${Date.now()}@nsm.or.th`;

    await loginAs(page, 'user-001');
    await page.goto('/admin');

    await page.getByRole('button', { name: /\+ เพิ่มหน่วยงาน/i }).click();
    const unitDialog = page.getByRole('dialog', { name: 'เพิ่มหน่วยงาน' });
    await unitDialog.getByRole('textbox', { name: 'ชื่อหน่วยงาน' }).fill(unitName);
    await unitDialog.getByRole('textbox', { name: 'ชื่อภาษาอังกฤษ' }).fill('Invite Candidate Unit');
    await selectAntOption(page, 'หน่วยงานแม่', 'อพวช.');
    await unitDialog.getByRole('button', { name: 'บันทึก', exact: true }).click();

    await page.getByRole('button', { name: /\+ เพิ่มผู้ใช้งาน/i }).click();
    const userDialog = page.getByRole('dialog', { name: 'เพิ่มผู้ใช้งาน' });
    await userDialog.getByRole('textbox', { name: 'ชื่อ-สกุล' }).fill(userName);
    await userDialog.getByRole('textbox', { name: 'ตำแหน่ง' }).fill('เจ้าหน้าที่ประสานงานใหม่');
    await selectAntOption(page, 'บทบาทในระบบ', 'Coordinator');
    await selectAntOption(page, 'สังกัดหน่วยงาน', unitName);
    await userDialog.getByRole('textbox', { name: 'อีเมล' }).fill(email);
    await userDialog.getByRole('textbox', { name: 'เบอร์โทร' }).fill('081-555-7777');
    await userDialog.getByRole('button', { name: 'บันทึก', exact: true }).click();

    await logout(page);
    await expect(page.getByText(userName, { exact: false })).toBeVisible();

    await loginAs(page, 'user-002');
    await page.goto('/projects/proj-001/team');
    await page.getByRole('button', { name: 'เชิญสมาชิก' }).click();

    const inviteDialog = page.getByRole('dialog', { name: 'เชิญสมาชิกเข้าทีมโครงการ' });
    await inviteDialog.locator('.ant-select-selector').click();
    await expect(
      page
        .locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden)')
        .getByText(userName, { exact: false }),
    ).toBeVisible();
  });

  test('PM can create a rich daily report with WBS links, activities, photos, and signatures', async ({
    page,
  }) => {
    const activityName = `ติดตั้ง API Gateway ${Date.now()}`;
    const photoName = `booking-api-${Date.now()}.jpg`;
    const issueText = `รอการยืนยัน endpoint จากระบบ SSO ${Date.now()}`;

    await loginAs(page, 'user-006');
    await page.goto('/projects/proj-002/daily-report');

    await page.getByRole('button', { name: /สร้างรายงานใหม่/i }).click();
    const reportDialog = page.getByRole('dialog', { name: 'สร้างรายงานประจำวัน' });

    await reportDialog.getByRole('textbox', { name: 'วันที่' }).fill('18/03/2026');
    await reportDialog.getByRole('textbox', { name: 'สภาพอากาศ' }).fill('ครึ้มเล็กน้อย (Cloudy)');
    await reportDialog.getByRole('spinbutton', { name: 'อุณหภูมิ' }).fill('31');

    await selectAntOption(page, 'WBS ที่เกี่ยวข้อง', '2.1 พัฒนา Booking API และฐานข้อมูล');

    await reportDialog.getByRole('button', { name: 'เพิ่มบุคลากร' }).click();
    await reportDialog.getByRole('textbox', { name: 'ประเภทบุคลากร 1' }).fill('นักพัฒนา Backend');
    await reportDialog.getByRole('spinbutton', { name: 'จำนวนบุคลากร 1' }).fill('4');

    await reportDialog.getByRole('button', { name: 'เพิ่มกิจกรรม' }).click();
    await reportDialog.getByRole('textbox', { name: 'ชื่อกิจกรรม 1' }).fill(activityName);
    await reportDialog.getByRole('spinbutton', { name: 'ปริมาณงาน 1' }).fill('12');
    await reportDialog.getByRole('textbox', { name: 'หน่วยงานกิจกรรม 1' }).fill('จุดเชื่อมต่อ');
    await reportDialog.getByRole('spinbutton', { name: 'ความก้าวหน้าสะสม 1' }).fill('65');
    await selectAntOption(page, 'WBS กิจกรรม', '2.1 พัฒนา Booking API และฐานข้อมูล');

    await reportDialog.getByRole('button', { name: 'เพิ่มภาพถ่าย' }).click();
    await reportDialog.getByRole('textbox', { name: 'ชื่อไฟล์ภาพ 1' }).fill(photoName);
    await reportDialog.getByRole('spinbutton', { name: 'ละติจูดภาพ 1' }).fill('13.7563');
    await reportDialog.getByRole('spinbutton', { name: 'ลองจิจูดภาพ 1' }).fill('100.5018');
    await reportDialog.getByRole('textbox', { name: 'เวลาถ่ายภาพ 1' }).fill('2026-03-18T10:30:00');

    await reportDialog.getByRole('textbox', { name: 'ผู้จัดทำรายงาน' }).fill('น.ส.วิภา ขจรศักดิ์');
    await reportDialog.getByRole('textbox', { name: 'ผู้ตรวจสอบ' }).fill('นายสมชาย กิตติพงษ์');
    await reportDialog.getByRole('switch', { name: 'ผู้จัดทำลงนาม' }).click();
    await reportDialog.getByRole('textbox', { name: 'ปัญหา/อุปสรรค' }).fill(issueText);
    await reportDialog.getByRole('button', { name: 'บันทึก', exact: true }).click();

    const latestReport = await page.evaluate(async ({ currentProjectId, currentIssueText }) => {
      const response = await fetch(`/api/daily-reports?projectId=${currentProjectId}`);
      const payload = await response.json();
      return payload.data.find((entry: { issues: string }) => entry.issues === currentIssueText);
    }, { currentProjectId: 'proj-002', currentIssueText: issueText });

    expect(latestReport).toBeTruthy();
    expect(latestReport.personnel.some((entry: { type: string }) => entry.type === 'นักพัฒนา Backend')).toBeTruthy();
    expect(latestReport.activities.some((entry: { task: string }) => entry.task === activityName)).toBeTruthy();
    expect(latestReport.photos.some((entry: { filename: string }) => entry.filename === photoName)).toBeTruthy();
    expect(latestReport.linkedWbs.length).toBeGreaterThan(0);
    expect(latestReport.signatures.reporter.name).toBe('น.ส.วิภา ขจรศักดิ์');
    expect(latestReport.signatures.reporter.signed).toBeTruthy();
  });

  test('PM can edit gantt predecessors and see dependency labels persist', async ({ page }) => {
    await loginAs(page, 'user-006');
    await page.goto('/projects/proj-002/gantt');

    await page.getByRole('button', { name: 'แก้ไข พัฒนา Frontend และ Dashboard' }).click();
    const ganttDialog = page.getByRole('dialog', { name: 'แก้ไขงานในแผน Gantt' });

    await ganttDialog.getByRole('combobox', { name: 'งานก่อนหน้า 1' }).focus();
    await ganttDialog.getByRole('combobox', { name: 'งานก่อนหน้า 1' }).press('ArrowDown');
    await page
      .locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden)')
      .getByText('พัฒนา Booking API และฐานข้อมูล', { exact: false })
      .first()
      .click();
    await ganttDialog.getByRole('button', { name: 'บันทึก', exact: true }).click();

    const targetRow = page.getByRole('row', { name: /พัฒนา Frontend และ Dashboard/i });
    await expect(targetRow).toContainText('พัฒนา Booking API และฐานข้อมูล');

    await page.reload();
    await expect(
      page.getByRole('row', { name: /พัฒนา Frontend และ Dashboard/i }),
    ).toContainText('พัฒนา Booking API และฐานข้อมูล');
  });
});
