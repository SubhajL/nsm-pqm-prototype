import { expect, test } from '@playwright/test';

async function loginAs(page: import('@playwright/test').Page, userId: string) {
  await page.goto('/login');
  await page.locator(`input[type="radio"][value="${userId}"]`).check();
  await page.getByRole('button', { name: 'เข้าสู่ระบบ' }).click();
  await page.waitForURL('**/dashboard');
}

test.describe('project schedule health', () => {
  test('dashboard and projects API expose delayed and watch states credibly on 2026-03-17', async ({
    page,
  }) => {
    await loginAs(page, 'user-001');

    const projectsResponse = await page.evaluate(async () => {
      const response = await fetch('/api/projects');
      return response.json();
    });

    const projects = projectsResponse.data as Array<{
      id: string;
      name: string;
      scheduleHealth?: string;
      status: string;
    }>;

    expect(
      projects.find((project) => project.id === 'proj-001')?.scheduleHealth,
    ).toBe('delayed');
    expect(
      projects.find((project) => project.id === 'proj-002')?.scheduleHealth,
    ).toBe('delayed');
    expect(
      projects.find((project) => project.id === 'proj-003')?.scheduleHealth,
    ).toBe('watch');

    await page.goto('/dashboard');

    const proj1Row = page.locator('tr').filter({
      has: page.getByRole('link', { name: 'โครงการปรับปรุงนิทรรศการดาราศาสตร์' }),
    });
    await expect(proj1Row.getByText('ล่าช้า (Delayed)')).toBeVisible();

    const proj2Row = page.locator('tr').filter({
      has: page.getByRole('link', { name: 'โครงการพัฒนาระบบจองกิจกรรมออนไลน์' }),
    });
    await expect(proj2Row.getByText('ล่าช้า (Delayed)')).toBeVisible();

    const proj3Row = page.locator('tr').filter({
      has: page.getByRole('link', { name: 'โครงการจัดซื้อระบบ AV ห้องประชุม' }),
    });
    await expect(proj3Row.getByText('เฝ้าระวัง (Watch)')).toBeVisible();
  });
});
