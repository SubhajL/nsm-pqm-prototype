import { expect, test } from '@playwright/test';

type Project = {
  id: string;
  name: string;
};

type QualityGate = {
  id: string;
  number: number;
  name: string;
};

type ITPItem = {
  id: string;
  item: string;
  status: 'passed' | 'conditional' | 'pending' | 'awaiting';
};

type InspectionRecord = {
  id: string;
  itpId: string;
  title: string;
  overallResult: 'pass' | 'conditional';
  autoNCR: boolean;
};

type Issue = {
  id: string;
  title: string;
  sourceInspectionId?: string;
};

async function loginAs(page: import('@playwright/test').Page, userId: string) {
  await page.goto('/login');
  await page.locator(`input[type="radio"][value="${userId}"]`).check();
  await page.getByRole('button', { name: 'เข้าสู่ระบบ' }).click();
  await page.waitForURL('**/dashboard');
}

async function getApiData<T>(
  page: import('@playwright/test').Page,
  path: string,
): Promise<T> {
  const response = await page.request.get(`/api${path}`);
  expect(response.ok(), `GET ${path} should succeed`).toBeTruthy();
  const payload = (await response.json()) as { data: T };
  return payload.data;
}

const ITP_STATUS_LABELS: Record<ITPItem['status'], string> = {
  passed: 'ผ่าน (PASSED)',
  conditional: 'ไม่ผ่านเงื่อนไข (CONDITIONAL)',
  pending: 'รอตรวจ (PENDING)',
  awaiting: 'รอผล (AWAITING)',
};

test.describe('quality consistency across projects', () => {
  test('keeps ITP, inspection detail, and NCR issues aligned for all visible projects', async ({ page }) => {
    await loginAs(page, 'user-001');

    const projects = await getApiData<Project[]>(page, '/projects');

    for (const project of projects) {
      await page.goto(`/projects/${project.id}/quality`);
      await expect(page.getByRole('heading', { name: /การควบคุมคุณภาพ/i })).toBeVisible();
      await expect(page.getByText('Quality Gate Pipeline')).toBeVisible();

      const gates = await getApiData<QualityGate[]>(page, `/quality/gates/${project.id}`);
      for (const gate of gates) {
        await expect(page.getByText(`G${gate.number}`, { exact: true })).toBeVisible();
        await expect(page.getByText(gate.name, { exact: true })).toBeVisible();
      }

      const inspectionData = await getApiData<{
        itpItems: ITPItem[];
        inspectionRecords: InspectionRecord[];
      }>(page, `/quality/inspections?projectId=${project.id}`);

      if (inspectionData.inspectionRecords.length === 0) {
        continue;
      }

      const issues = await getApiData<Issue[]>(page, `/issues/${project.id}`);

      for (const record of inspectionData.inspectionRecords) {
        const itpItem = inspectionData.itpItems.find((item) => item.id === record.itpId);
        expect(itpItem, `${project.id} should have linked ITP item for ${record.id}`).toBeTruthy();

        const itpRow = page.locator('.ant-table-row').filter({
          has: page.getByText(itpItem!.item, { exact: false }),
        }).first();
        await expect(itpRow.getByText(ITP_STATUS_LABELS[itpItem!.status], { exact: false })).toBeVisible();

        await page.getByRole('button', { name: record.title, exact: true }).click();
        await expect(page.getByRole('heading', { name: /แบบฟอร์มตรวจสอบคุณภาพ/i })).toBeVisible();
        await expect(page.getByText(record.title, { exact: true })).toBeVisible();

        if (record.overallResult === 'pass') {
          await expect(page.getByText('ผ่าน (PASS)').first()).toBeVisible();
          await expect(page.getByText('Auto NCR')).toHaveCount(0);
        } else {
          await expect(page.getByText('ไม่ผ่านเงื่อนไข — Conditional (FAIL)')).toBeVisible();
          await expect(page.getByText('Auto NCR — ระบบสร้าง Issue (NCR) อัตโนมัติ')).toBeVisible();

          const linkedIssue = issues.find((issue) => issue.sourceInspectionId === record.id);
          expect(linkedIssue, `${project.id} ${record.id} should have an auto NCR issue`).toBeTruthy();

          await page.goto(`/projects/${project.id}/issues`);
          await expect(page.getByText(linkedIssue!.title, { exact: true })).toBeVisible();
          await page.goto(`/projects/${project.id}/quality`);
        }
      }
    }
  });
});
