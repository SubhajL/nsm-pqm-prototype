import { expect, test } from '@playwright/test';

async function loginAs(page: import('@playwright/test').Page, userId: string) {
  await page.goto('/login');
  await page.locator(`input[type="radio"][value="${userId}"]`).check();
  await page.getByRole('button', { name: 'เข้าสู่ระบบ' }).click();
  await page.waitForURL('**/dashboard');
}

test.describe('Scenario 1: create construction project via demo fill', () => {
  test('demo fill populates form correctly', async ({ page }) => {
    await loginAs(page, 'user-002');
    await page.goto('/projects/new');
    await expect(page.getByRole('heading', { name: /สร้างโครงการใหม่/i })).toBeVisible();

    // Click demo fill
    await page.getByRole('button', { name: /Demo.*Scenario 1/i }).click();
    await expect(page.getByText('เติมข้อมูลตัวอย่าง Scenario 1 แล้ว')).toBeVisible();

    // Verify key fields populated
    await expect(page.locator('#name')).toHaveValue('โครงการปรับปรุงอาคารนิทรรศการ อาคาร C');

    // Verify 4 milestones in table
    await expect(page.locator('table tbody tr')).toHaveCount(4);

    // Verify milestone amounts appear in spinbuttons
    await expect(page.locator('input[value="2,775,000"]').first()).toBeVisible();
  });

  test('demo fill project can be created and redirects to project shell', async ({ page }) => {
    await loginAs(page, 'user-002');
    await page.goto('/projects/new');

    // Fill and submit
    await page.getByRole('button', { name: /Demo.*Scenario 1/i }).click();
    // Click the create button (the teal primary button at the bottom)
    const createBtn = page.getByRole('button', { name: /สร้างโครงการ/ });
    await createBtn.scrollIntoViewIfNeeded();
    await createBtn.click();

    // Wait for redirect — the form submission + API + redirect can take time
    await page.waitForURL(/\/projects\/(?!new)/, { timeout: 30000 });
    expect(page.url()).not.toContain('/new');

    // Project name should appear somewhere on the overview
    await expect(page.getByText('อาคาร C').first()).toBeVisible({ timeout: 10000 });
  });

  test('new project appears in project list and all pages load', async ({ page }) => {
    // First create the project
    await loginAs(page, 'user-002');
    await page.goto('/projects/new');
    await page.getByRole('button', { name: /Demo.*Scenario 1/i }).click();
    const createBtn = page.getByRole('button', { name: /สร้างโครงการ/ });
    await createBtn.scrollIntoViewIfNeeded();
    await createBtn.click();
    await page.waitForURL(/\/projects\/(?!new)/, { timeout: 30000 });

    // Extract project ID from URL
    const projUrl = page.url();
    const match = projUrl.match(/\/projects\/([^/]+)/);
    const projId = match?.[1] ?? '';
    expect(projId).toBeTruthy();

    // Navigate to each module via sidebar links
    // Gantt
    await page.goto(`/projects/${projId}/gantt`);
    await page.waitForLoadState('networkidle');
    await expect(page.getByText('แผนภูมิแกนต์').first()).toBeVisible({ timeout: 10000 });

    // EVM (route: s-curve)
    await page.goto(`/projects/${projId}/s-curve`);
    await page.waitForLoadState('networkidle');
    await expect(page.getByText(/EVM|งบประมาณ|S-Curve|BAC/).first()).toBeVisible({ timeout: 10000 });

    // Quality
    await page.goto(`/projects/${projId}/quality`);
    await page.waitForLoadState('networkidle');
    await expect(page.getByText('Concept').first()).toBeVisible({ timeout: 10000 });

    // Daily Report
    await page.goto(`/projects/${projId}/daily-report`);
    await page.waitForLoadState('networkidle');
    await expect(page.getByText('รายงานประจำวัน').first()).toBeVisible({ timeout: 10000 });
  });
});
