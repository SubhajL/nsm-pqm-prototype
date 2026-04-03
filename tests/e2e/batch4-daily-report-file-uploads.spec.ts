import { expect, test } from '@playwright/test';

async function loginAs(page: import('@playwright/test').Page, userId: string) {
  await page.goto('/login');
  await page.locator(`input[type="radio"][value="${userId}"]`).check();
  await page.getByRole('button', { name: 'เข้าสู่ระบบ' }).click();
  await page.waitForURL('**/dashboard');
}

function expectUploadUrl(url: string | undefined) {
  expect(url).toBeTruthy();
  expect(
    url?.includes('/mock-uploads/daily-reports/') ||
      (url?.includes('/daily-reports/') &&
        url?.includes('.blob.vercel-storage.com')) ||
      false,
  ).toBe(true);
}

test.describe('batch 4 daily report real file uploads', () => {
  test('daily report creation uploads real photos and attachments with persisted links', async ({
    page,
  }) => {
    const issueText = `อัปโหลดไฟล์รายงาน ${Date.now()}`;

    await loginAs(page, 'user-006');
    await page.goto('/projects/proj-002/daily-report');

    await page.getByRole('button', { name: /สร้างรายงานใหม่/i }).click();
    const reportDialog = page.getByRole('dialog', { name: 'สร้างรายงานประจำวัน' });

    await reportDialog.getByRole('textbox', { name: 'วันที่' }).fill('19/03/2026');
    await reportDialog.getByRole('textbox', { name: 'สภาพอากาศ' }).fill('แดดจัด (Sunny)');
    await reportDialog.getByRole('spinbutton', { name: 'อุณหภูมิ' }).fill('31');
    await reportDialog.getByRole('button', { name: 'เพิ่มบุคลากร' }).click();
    await reportDialog.getByRole('textbox', { name: 'ประเภทบุคลากร 1' }).fill('วิศวกรระบบ');
    await reportDialog.getByRole('spinbutton', { name: 'จำนวนบุคลากร 1' }).fill('2');
    await reportDialog.getByRole('button', { name: 'เพิ่มกิจกรรม' }).click();
    await reportDialog.getByRole('textbox', { name: 'ชื่อกิจกรรม 1' }).fill('ติดตาม integration test');
    await reportDialog.getByRole('spinbutton', { name: 'ปริมาณงาน 1' }).fill('1');
    await reportDialog.getByRole('textbox', { name: 'หน่วยงานกิจกรรม 1' }).fill('งาน');
    await reportDialog.getByRole('spinbutton', { name: 'ความก้าวหน้าสะสม 1' }).fill('30');

    await reportDialog.locator('[data-testid="daily-report-photo-upload"]').setInputFiles({
      name: 'site-progress.jpg',
      mimeType: 'image/jpeg',
      buffer: Buffer.from('fake-jpeg-upload-content'),
    });
    await reportDialog.getByRole('spinbutton', { name: 'ละติจูดภาพ 1' }).fill('13.7563');
    await reportDialog.getByRole('spinbutton', { name: 'ลองจิจูดภาพ 1' }).fill('100.5018');
    await reportDialog.getByRole('textbox', { name: 'เวลาถ่ายภาพ 1' }).fill('2026-03-19T10:15:00');

    await reportDialog
      .locator('[data-testid="daily-report-attachment-upload"]')
      .setInputFiles({
        name: 'daily-report-note.pdf',
        mimeType: 'application/pdf',
        buffer: Buffer.from('%PDF-1.4 mock attachment'),
      });

    await reportDialog.getByRole('textbox', { name: 'ผู้จัดทำรายงาน' }).fill('น.ส.สมศรี วรรณดี');
    await reportDialog.getByRole('textbox', { name: 'ผู้ตรวจสอบ' }).fill('นายสมชาย กิตติพงษ์');
    await reportDialog.getByRole('textbox', { name: 'ปัญหา/อุปสรรค' }).fill(issueText);
    await reportDialog.getByRole('button', { name: 'บันทึก', exact: true }).click();

    await expect(page.getByText(issueText)).toBeVisible();
    await expect(page.getByRole('img', { name: /site-progress\.jpg/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /daily-report-note\.pdf/i })).toBeVisible();

    const createdReport = await page.evaluate(async (currentIssueText) => {
      const response = await fetch('/api/daily-reports?projectId=proj-002');
      const payload = await response.json();
      return payload.data.find((entry: { issues: string }) => entry.issues === currentIssueText);
    }, issueText);

    expectUploadUrl(createdReport?.photos?.[0]?.url);
    expectUploadUrl(createdReport?.attachments?.[0]?.url);
  });
});
