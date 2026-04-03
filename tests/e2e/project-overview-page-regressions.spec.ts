import { expect, test } from '@playwright/test';

type Project = {
  id: string;
  name: string;
};

type Milestone = {
  name: string;
  status: 'pending' | 'in_progress' | 'review' | 'completed';
};

type GanttTask = {
  id: number;
  start_date: string;
  progress: number;
  parent: number;
  type: string;
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

test.describe('project overview page regressions', () => {
  test('shows normalized overall progress and milestone health states', async ({ page }) => {
    await loginAs(page, 'user-001');

    await page.goto('/projects/proj-001');

    const headerCard = page.locator('.ant-card').filter({
      has: page.getByRole('heading', { name: 'โครงการปรับปรุงนิทรรศการดาราศาสตร์' }),
    }).first();

    await expect(headerCard.getByText('กำลังดำเนินการ (In Progress)').first()).toBeVisible();
    await expect(headerCard.getByText('ล่าช้า (Delayed)').first()).toBeVisible();
    await expect(page.getByText('24.8%').first()).toBeVisible();
    await expect(page.getByText('0.248%')).toHaveCount(0);

    const milestoneCard = page.locator('.ant-card').filter({
      has: page.getByText('งวดงาน (Payment Milestones)'),
    }).first();

    await expect(milestoneCard.getByText('ล่าช้า (Delayed)').first()).toBeVisible();
    await expect(milestoneCard.getByText('82%').first()).toBeVisible();
    await expect(milestoneCard.getByText('ยังไม่เริ่ม (Not Started)')).toHaveCount(2);
  });

  test('clarifies whether the overview budget card shows spent cost or paid-to-date', async ({ page }) => {
    await loginAs(page, 'user-001');

    await page.goto('/projects/proj-002');

    const internalBudgetCard = page.locator('.ant-card').filter({
      has: page.getByText('งบประมาณ'),
    }).filter({
      has: page.getByText('3.2M฿'),
    }).first();

    await expect(internalBudgetCard.getByText('ใช้ไปแล้ว (Actual Cost)')).toBeVisible();
    await expect(internalBudgetCard.getByText('2,325,000฿')).toBeVisible();

    await page.goto('/projects/proj-001');

    const outsourcedBudgetCard = page.locator('.ant-card').filter({
      has: page.getByText('งบประมาณ'),
    }).filter({
      has: page.getByText('12.5M฿'),
    }).first();

    await expect(outsourcedBudgetCard.getByText('จ่ายแล้วสะสม (Paid to Date)')).toBeVisible();
    await expect(outsourcedBudgetCard.getByText('6,250,000฿')).toBeVisible();
  });

  test('shows not started for every zero-progress installment across all projects', async ({ page }) => {
    await loginAs(page, 'user-001');

    const projects = await getApiData<Project[]>(page, '/projects');

    for (const project of projects) {
      const milestones = await getApiData<Milestone[]>(page, `/milestones/${project.id}`);
      const gantt = await getApiData<{ data: GanttTask[] }>(page, `/gantt/${project.id}`);
      const topLevelPhaseTasks = gantt.data
        .filter((task) => task.parent === 0 && task.type === 'project')
        .sort((left, right) => left.start_date.localeCompare(right.start_date));

      const zeroProgressMilestones = milestones.filter((milestone, index) => {
        const matchedPhase = topLevelPhaseTasks[index];
        return milestone.status !== 'completed' && (matchedPhase?.progress ?? 0) <= 0;
      });

      if (zeroProgressMilestones.length === 0) {
        continue;
      }

      await page.goto(`/projects/${project.id}`);

      const milestoneCard = page.locator('.ant-card').filter({
        has: page.getByText('งวดงาน (Payment Milestones)'),
      }).first();

      for (const milestone of zeroProgressMilestones) {
        const milestoneItem = milestoneCard.locator('.ant-steps-item').filter({
          has: page.getByText(milestone.name, { exact: true }),
        }).first();

        await expect(
          milestoneItem.getByText('ยังไม่เริ่ม (Not Started)', { exact: false }),
          `${project.id} ${milestone.name} should show Not Started`,
        ).toBeVisible();
      }
    }
  });

  test('navigates from overview KPI cards to the requested pages', async ({ page }) => {
    await loginAs(page, 'user-001');

    await page.goto('/projects/proj-001');

    await page.getByRole('button', { name: /งบประมาณ/i }).click();
    await expect(page).toHaveURL(/\/projects\/proj-001\/s-curve$/);

    await page.goto('/projects/proj-001');
    await page.getByRole('button', { name: /^SPI/i }).click();
    await expect(page).toHaveURL(/\/projects\/proj-001\/s-curve$/);

    await page.goto('/projects/proj-001');
    await page.getByRole('button', { name: /จ่ายแล้ว/i }).click();
    await expect(page).toHaveURL(/\/projects\/proj-001\/s-curve$/);

    await page.goto('/projects/proj-001');
    await page.getByRole('button', { name: /ปัญหาเปิด/i }).click();
    await expect(page).toHaveURL(/\/projects\/proj-001\/issues$/);

    await page.goto('/projects/proj-001');
    await page.getByRole('button', { name: /ความเสี่ยงสูง/i }).click();
    await expect(page).toHaveURL(/\/projects\/proj-001\/risk$/);
  });
});
