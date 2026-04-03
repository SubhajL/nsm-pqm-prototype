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

async function createProject(page: import('@playwright/test').Page, projectName: string) {
  return createProjectWithExecutionModel(page, projectName, 'โครงการภายใน');
}

async function createProjectWithExecutionModel(
  page: import('@playwright/test').Page,
  projectName: string,
  executionModelLabel: string,
) {
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
    executionModelLabel,
  );
  await page.getByPlaceholder('ระบุวัตถุประสงค์ของโครงการ').fill('Bootstrap validation objective');
  await page.getByPlaceholder('ระบุรายละเอียดเพิ่มเติม (ถ้ามี)').fill('Bootstrap test');
  await page.getByPlaceholder('เลือกวันที่เริ่มต้น').fill('01/06/2026');
  await page.getByPlaceholder('เลือกวันที่สิ้นสุด').fill('31/12/2026');
  await selectOptionByFormLabel(
    page,
    'วิธีคำนวณ Progress (Progress Calculation Method)',
    'Weighting Method',
  );

  await page.getByRole('button', { name: /สร้างโครงการ \(Create Project\)/i }).click();
  await expect(page).toHaveURL(/\/projects\/[0-9a-f-]{36}$/);
  return page.url().split('/projects/')[1];
}

test.describe('new-project bootstrap state', () => {
  test('new project starts with explicit empty state across project-scoped modules', async ({
    page,
  }) => {
    const projectName = `Bootstrap Project ${Date.now()}`;

    await loginAs(page, 'user-002');
    const projectId = await createProject(page, projectName);

    await expect(page.getByRole('heading', { name: projectName })).toBeVisible();
    await expect(page.getByText('ยังไม่มีกิจกรรมล่าสุดสำหรับโครงการนี้')).toBeVisible();

    await page.getByRole('link', { name: /ทีมโครงการ \(Team\)/i }).click();
    await expect(page).toHaveURL(new RegExp(`/projects/${projectId}/team$`));
    await expect(page.getByText('น.ส.วิภา ขจรศักดิ์', { exact: false }).first()).toBeVisible();
    await expect(page.getByText('สมชาย กิตติศักดิ์', { exact: false })).toHaveCount(0);
    await expect(page.getByText('ยังไม่มีสมาชิกโครงการ')).toHaveCount(0);

    await page.getByRole('link', { name: /เอกสาร \(Documents\)/i }).click();
    await expect(page).toHaveURL(new RegExp(`/projects/${projectId}/documents$`));
    await expect(
      page.getByRole('heading', { name: /คลังเอกสารโครงการ/i }),
    ).toBeVisible();
    await expect(page.getByText(projectName).first()).toBeVisible();
    await expect(page.getByText('แบบสถาปัตย์_Rev3.pdf')).toHaveCount(0);
    await expect(page.getByText('สัญญาจ้าง_PJ2569.pdf')).toHaveCount(0);
    await expect(page.getByText('ไม่มีเอกสารในโฟลเดอร์นี้')).toBeVisible();

    await page.getByRole('link', { name: /คุณภาพ \(Quality\)/i }).click();
    await expect(page).toHaveURL(new RegExp(`/projects/${projectId}/quality$`));
    await expect(
      page.getByRole('heading', { name: /การควบคุมคุณภาพ/i }),
    ).toBeVisible();
    await expect(page.getByText('ทบทวนความต้องการระบบ')).toBeVisible();
    await expect(page.getByText('ยังไม่มีบันทึกผลตรวจคุณภาพ')).toBeVisible();

    await page.getByRole('link', { name: /งบประมาณ \(EVM\)/i }).click();
    await expect(page).toHaveURL(new RegExp(`/projects/${projectId}/s-curve$`));
    await expect(page.getByText('ยังไม่มีข้อมูลงวด EVM กรุณาบันทึกงวดแรกของโครงการ')).toBeVisible();
    await expect(page.getByText('ยังไม่มีเส้นโค้ง EVM เพราะยังไม่มีข้อมูลงวด')).toBeVisible();
    await expect(page.getByText('ยังไม่มีแนวโน้ม CPI/SPI เพราะยังไม่มีข้อมูลงวด')).toBeVisible();
    await expect(page.getByText('BAC (Budget at Completion)')).toBeVisible();

    await page.getByRole('link', { name: /แผนงาน \(Gantt\)/i }).click();
    await expect(page).toHaveURL(new RegExp(`/projects/${projectId}/gantt$`));
    await expect(page.getByRole('button', { name: /เพิ่มงาน/i })).toBeVisible();
    await expect(page.getByText('งวดที่ 1 (15%)')).toBeVisible();
    await expect(page.getByText('งานที่ 1 (15%)')).toHaveCount(0);

    await page.getByRole('link', { name: /รายงานประจำวัน/i }).click();
    await expect(page).toHaveURL(new RegExp(`/projects/${projectId}/daily-report$`));
    await expect(page.getByText('สร้างรายงานใหม่')).toBeVisible();
    await expect(page.getByText('รายงาน #')).toHaveCount(0);

    await page.getByRole('link', { name: /ความเสี่ยง \(Risk\)/i }).click();
    await expect(page).toHaveURL(new RegExp(`/projects/${projectId}/risk$`));
    await expect(page.getByText('บันทึกความเสี่ยงใหม่')).toBeVisible();
    await expect(page.getByText('ความเสี่ยงด้านเวลาโครงการ')).toHaveCount(0);

    await page.getByRole('link', { name: /ปัญหา \(Issues\)/i }).click();
    await expect(page).toHaveURL(new RegExp(`/projects/${projectId}/issues$`));
    await expect(page.getByText('เปิดเคสใหม่')).toBeVisible();
    await expect(page.getByText('รอคำตอบผู้รับเหมา')).toHaveCount(0);
  });

  test('new outsourced project starts with outsourced payment-tracking empty state', async ({
    page,
  }) => {
    const projectName = `Bootstrap Outsourced ${Date.now()}`;

    await loginAs(page, 'user-002');
    const projectId = await createProjectWithExecutionModel(
      page,
      projectName,
      'จ้างภายนอก',
    );

    await page.goto(`/projects/${projectId}/s-curve`);
    await expect(page.getByText('ยังไม่มีข้อมูลงวดความก้าวหน้า/เบิกจ่าย กรุณาบันทึกงวดแรกของสัญญา')).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Paid to Date' })).toBeVisible();
    await expect(page.getByText('CPI (Cost Performance Index)')).toHaveCount(0);
    await expect(page.getByText('ยังไม่มีแนวโน้มการเบิกจ่าย เพราะยังไม่มีข้อมูลงวด')).toBeVisible();
  });
});
