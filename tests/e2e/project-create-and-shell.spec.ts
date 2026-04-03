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

test.describe('project creation and project shell', () => {
  test('PM can create a project, add WBS, and stay in the new project context across LHS menus', async ({
    page,
  }) => {
    const projectName = `E2E Project ${Date.now()}`;
    const boqDescription = `โครงสร้างเหล็ก ${Date.now()}`;
    const dailyIssueText = `ติดตามงาน E2E ${Date.now()}`;
    const riskTitle = `ความเสี่ยง E2E ${Date.now()}`;
    const issueTitle = `ประเด็น E2E ${Date.now()}`;

    await loginAs(page, 'user-002');

    await page.getByRole('button', { name: /สร้างโครงการใหม่/i }).click();
    await page.waitForURL('**/projects/new');

    await page.getByPlaceholder('ระบุชื่อโครงการ').fill(projectName);
    await selectOptionByFormLabel(
      page,
      'ประเภทโครงการ (Project Type)',
      'พัฒนาระบบ IT',
    );
    await page.getByPlaceholder('ระบุวัตถุประสงค์ของโครงการ').fill('E2E validation objective');
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

    const projectUrl = page.url();
    const projectId = projectUrl.split('/projects/')[1];

    const createdProjectResponse = await page.evaluate(async (newProjectId) => {
      const response = await fetch(`/api/projects/${newProjectId}`);
      return response.json();
    }, projectId);

    expect(createdProjectResponse.data.status).toBe('planning');
    expect(createdProjectResponse.data.scheduleHealth).toBe('on_schedule');

    await expect(
      page.getByRole('heading', { name: projectName }),
    ).toBeVisible();
    await expect(page.getByText('ยังไม่มีกิจกรรมล่าสุดสำหรับโครงการนี้')).toBeVisible();
    await expect(page.getByText('วางแผน (Planning)').first()).toBeVisible();
    await expect(page.getByRole('combobox', { name: 'เปลี่ยนสถานะโครงการ' })).toHaveCount(0);

    await page.getByRole('link', { name: /ทีมโครงการ \(Team\)/i }).click();
    await expect(page).toHaveURL(new RegExp(`/projects/${projectId}/team$`));
    await expect(
      page.getByRole('heading', { name: /ทีมโครงการ \(Project Team\)/i }),
    ).toBeVisible();
    await expect(
      page.getByRole('main').getByText('น.ส.วิภา ขจรศักดิ์', { exact: false }).first(),
    ).toBeVisible();
    await expect(page.getByText('สมชาย กิตติศักดิ์', { exact: false })).toHaveCount(0);
    await expect(page.getByText('ปรียา สุวรรณ', { exact: false })).toHaveCount(0);

    await page.getByRole('link', { name: /WBS\/BOQ/i }).click();
    await expect(page).toHaveURL(new RegExp(`/projects/${projectId}/wbs$`));
    await expect(page.getByRole('heading', { name: /WBS/ })).toBeVisible();
    await expect(page.getByText('ไม่พบข้อมูล WBS')).toHaveCount(0);
    await expect(page.getByText('BOQ — 1.0 แบบรายละเอียด (Detail Design)')).toBeVisible();
    await expect(page.getByText('ไม่มีรายการ BOQ สำหรับ WBS node นี้')).toBeVisible();

    await page.getByRole('button', { name: /เพิ่ม WBS Node/i }).click();
    const wbsDialog = page.getByRole('dialog', { name: 'เพิ่ม WBS Node' });
    await wbsDialog.getByRole('textbox', { name: /ชื่องาน WBS/i }).fill('งานออกแบบรายละเอียด');
    await wbsDialog.getByRole('button', { name: 'บันทึก', exact: true }).click();
    await expect(page.getByText('BOQ — 1.1 งานออกแบบรายละเอียด')).toBeVisible();
    await expect(page.getByText('ไม่พบข้อมูล WBS')).not.toBeVisible();

    await page.getByRole('button', { name: /\+ เพิ่มรายการ BOQ/i }).click();
    const boqDialog = page.getByRole('dialog', { name: 'เพิ่มรายการ BOQ' });
    await boqDialog.getByRole('textbox', { name: /รายการ/i }).fill(boqDescription);
    await boqDialog.getByRole('spinbutton', { name: /ปริมาณ/i }).fill('5');
    await boqDialog.getByRole('textbox', { name: /หน่วย/i }).fill('งาน');
    await boqDialog.getByRole('spinbutton', { name: /ราคา\/หน่วย/i }).fill('12000');
    await boqDialog.getByRole('button', { name: 'บันทึก', exact: true }).click();
    await expect(page.getByText(boqDescription)).toBeVisible();

    await page.getByRole('link', { name: /รายงานประจำวัน/i }).click();
    await expect(page).toHaveURL(new RegExp(`/projects/${projectId}/daily-report$`));
    await page.getByRole('button', { name: /สร้างรายงานใหม่/i }).click();
    const dailyDialog = page.getByRole('dialog', { name: 'สร้างรายงานประจำวัน' });
    await dailyDialog.getByRole('textbox', { name: /วันที่/i }).fill('16/03/2026');
    await dailyDialog.getByRole('textbox', { name: /สภาพอากาศ/i }).fill('แดดจัด (Sunny)');
    await dailyDialog.getByRole('spinbutton', { name: /อุณหภูมิ/i }).fill('33');
    await dailyDialog.getByRole('button', { name: 'เพิ่มบุคลากร' }).click();
    await dailyDialog.getByRole('textbox', { name: 'ประเภทบุคลากร 1' }).fill('วิศวกรสนาม');
    await dailyDialog.getByRole('spinbutton', { name: 'จำนวนบุคลากร 1' }).fill('6');
    await dailyDialog.getByRole('button', { name: 'เพิ่มกิจกรรม' }).click();
    await dailyDialog.getByRole('textbox', { name: 'ชื่อกิจกรรม 1' }).fill('ติดตามงานภาคสนาม');
    await dailyDialog.getByRole('spinbutton', { name: 'ปริมาณงาน 1' }).fill('1');
    await dailyDialog.getByRole('textbox', { name: 'หน่วยงานกิจกรรม 1' }).fill('งาน');
    await dailyDialog.getByRole('spinbutton', { name: 'ความก้าวหน้าสะสม 1' }).fill('25');
    await dailyDialog.getByRole('textbox', { name: 'ผู้จัดทำรายงาน' }).fill('น.ส.วิภา ขจรศักดิ์');
    await dailyDialog.getByRole('textbox', { name: 'ผู้ตรวจสอบ' }).fill('น.ส.วิภา ขจรศักดิ์');
    await dailyDialog.getByRole('textbox', { name: /ปัญหา\/อุปสรรค/i }).fill(dailyIssueText);
    await dailyDialog.getByRole('button', { name: 'บันทึก', exact: true }).click();
    await expect(page.getByText(dailyIssueText)).toBeVisible();

    await page.getByRole('link', { name: /ความเสี่ยง \(Risk\)/i }).click();
    await expect(page).toHaveURL(new RegExp(`/projects/${projectId}/risk$`));
    await page.getByRole('button', { name: /บันทึกความเสี่ยงใหม่/i }).click();
    const riskDialog = page.getByRole('dialog', { name: 'บันทึกความเสี่ยงใหม่' });
    await riskDialog.getByRole('textbox', { name: /หัวข้อความเสี่ยง/i }).fill(riskTitle);
    await riskDialog.getByRole('textbox', { name: /รายละเอียด/i }).fill('ความเสี่ยงที่สร้างจาก Playwright');
    await riskDialog.getByRole('spinbutton', { name: /โอกาสเกิด/i }).fill('4');
    await riskDialog.getByRole('spinbutton', { name: /ผลกระทบ/i }).fill('4');
    await riskDialog.getByRole('textbox', { name: /ผู้รับผิดชอบ/i }).fill('น.ส.วิภา ขจรศักดิ์');
    await riskDialog.getByRole('textbox', { name: /แนวทางจัดการ/i }).fill('ติดตามอย่างใกล้ชิด');
    await riskDialog.getByRole('button', { name: 'บันทึก', exact: true }).click();
    await expect(page.getByText(riskTitle)).toBeVisible();

    await page.getByRole('link', { name: /ปัญหา \(Issues\)/i }).click();
    await expect(page).toHaveURL(new RegExp(`/projects/${projectId}/issues$`));
    await page.getByRole('button', { name: /เปิดเคสใหม่/i }).click();
    const issueDialog = page.getByRole('dialog', { name: 'เปิดเคสใหม่' });
    await issueDialog.getByRole('textbox', { name: /หัวข้อปัญหา/i }).fill(issueTitle);
    await issueDialog.getByRole('textbox', { name: /ผู้รับผิดชอบ/i }).fill('น.ส.วิภา ขจรศักดิ์');
    await issueDialog.getByRole('textbox', { name: /อ้างอิง WBS/i }).fill('WBS 1.0');
    await issueDialog.getByRole('spinbutton', { name: /SLA/i }).fill('48');
    await issueDialog.getByRole('button', { name: 'บันทึก', exact: true }).click();
    await expect(page.getByText(issueTitle)).toBeVisible();

    const routeChecks: Array<{ link: RegExp; heading: RegExp; suffix: string }> = [
      { link: /แผนงาน \(Gantt\)/i, heading: /แผนภูมิแกนต์/i, suffix: 'gantt' },
      { link: /งบประมาณ \(EVM\)/i, heading: /EVM|Earned Value/i, suffix: 's-curve' },
      { link: /คุณภาพ \(Quality\)/i, heading: /การควบคุมคุณภาพ/i, suffix: 'quality' },
      { link: /เอกสาร \(Documents\)/i, heading: /คลังเอกสารโครงการ/i, suffix: 'documents' },
    ];

    for (const routeCheck of routeChecks) {
      await page.getByRole('link', { name: routeCheck.link }).click();
      await expect(page).toHaveURL(
        new RegExp(`/projects/${projectId}/${routeCheck.suffix}$`),
      );
      await expect(page.getByRole('heading', { name: routeCheck.heading })).toBeVisible();
    }
  });

  test('non-PM users do not get the create-project entry point', async ({ page }) => {
    await loginAs(page, 'user-003');

    await expect(
      page.getByRole('button', { name: /สร้างโครงการใหม่/i }),
    ).toHaveCount(0);

    await page.goto('/projects/new');
    await page.waitForURL('**/dashboard');
    await expect(
      page.getByRole('button', { name: /สร้างโครงการใหม่/i }),
    ).toHaveCount(0);
  });

  test('system admin can also access the create-project entry point', async ({ page }) => {
    await loginAs(page, 'user-001');

    await expect(
      page.getByRole('button', { name: /สร้างโครงการใหม่/i }),
    ).toBeVisible();

    await page.goto('/projects/new');
    await expect(page).toHaveURL('http://127.0.0.1:3101/projects/new');
    await expect(
      page.getByRole('heading', { name: /สร้างโครงการใหม่ \(New Project\)/i }),
    ).toBeVisible();
  });

  test('system admin still sees portfolio data after a full reload', async ({ page }) => {
    await loginAs(page, 'user-001');

    await page.reload();
    await page.waitForURL('**/dashboard');

    await expect(page.getByText('โครงการทั้งหมด (Total Projects)')).toBeVisible();
    await expect(page.getByText(/^5$/).first()).toBeVisible();
    await expect(
      page.getByRole('link', { name: 'โครงการปรับปรุงนิทรรศการดาราศาสตร์' }),
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: /สร้างโครงการใหม่/i }),
    ).toBeVisible();
  });
});
