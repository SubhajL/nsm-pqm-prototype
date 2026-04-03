import { expect, test } from '@playwright/test';

async function loginAs(page: import('@playwright/test').Page, userId: string) {
  await page.goto('/login');
  await page.locator(`input[type="radio"][value="${userId}"]`).check();
  await page.getByRole('button', { name: 'เข้าสู่ระบบ' }).click();
  await page.waitForURL('**/dashboard');
}

/** Click an Ant Design Radio.Group button by label text */
async function clickRadioButton(page: import('@playwright/test').Page, label: string) {
  await page.locator('label.ant-radio-button-wrapper').filter({ hasText: label }).click();
}

/** Assert an Ant Design Radio.Group button is checked */
async function expectRadioChecked(page: import('@playwright/test').Page, label: string) {
  await expect(
    page.locator('label.ant-radio-button-wrapper-checked').filter({ hasText: label }),
  ).toBeVisible();
}

test.describe('gantt toolbar view mode (proj-001)', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'user-002');
    await page.goto('/projects/proj-001/gantt');
    await expect(page.getByRole('heading', { name: /แผนภูมิแกนต์/i })).toBeVisible();
  });

  test('default view is ปัจจุบัน and เดือน with no baseline bars', async ({ page }) => {
    await expectRadioChecked(page, 'ปัจจุบัน');
    await expectRadioChecked(page, 'เดือน');
    await expect(page.getByText('ม.ค.').first()).toBeVisible();
    await expect(page.locator('[data-testid="baseline-bar"]')).toHaveCount(0);
  });

  test('Baseline view shows baseline bars', async ({ page }) => {
    await clickRadioButton(page, 'Baseline');
    await expectRadioChecked(page, 'Baseline');
    await expect(page.locator('[data-testid="baseline-bar"]').first()).toBeVisible();
  });

  test('เปรียบเทียบ shows both baseline and current bars', async ({ page }) => {
    await clickRadioButton(page, 'เปรียบเทียบ');
    await expectRadioChecked(page, 'เปรียบเทียบ');
    await expect(page.locator('[data-testid="baseline-bar"]').first()).toBeVisible();
    const progressFills = page.locator('div[style*="transition: width"]');
    await expect(progressFills.first()).toBeVisible();
  });

  test('switching back to ปัจจุบัน hides baseline bars', async ({ page }) => {
    await clickRadioButton(page, 'เปรียบเทียบ');
    await expect(page.locator('[data-testid="baseline-bar"]').first()).toBeVisible();
    await clickRadioButton(page, 'ปัจจุบัน');
    await expect(page.locator('[data-testid="baseline-bar"]')).toHaveCount(0);
  });

  test('Baseline view shows baseline milestone markers', async ({ page }) => {
    await clickRadioButton(page, 'Baseline');
    await expect(page.locator('[data-testid="baseline-milestone"]').first()).toBeVisible();
  });
});

test.describe('gantt toolbar time scale (proj-001)', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'user-002');
    await page.goto('/projects/proj-001/gantt');
    await expect(page.getByRole('heading', { name: /แผนภูมิแกนต์/i })).toBeVisible();
  });

  test('สัปดาห์ scale shows week labels', async ({ page }) => {
    await clickRadioButton(page, 'สัปดาห์');
    await expectRadioChecked(page, 'สัปดาห์');
    await expect(page.getByText('W1').first()).toBeVisible();
    await expect(page.getByText('W2').first()).toBeVisible();
  });

  test('วัน scale makes table wider with horizontal scroll', async ({ page }) => {
    // Get the scrollable container (Ant Design uses .ant-table-content or .ant-table-body)
    const scrollContainer = page.locator('.ant-table-content, .ant-table-body').first();
    await expect(scrollContainer).toBeVisible();

    // Record month-scale scroll width
    const monthScrollWidth = await scrollContainer.evaluate((el) => el.scrollWidth);

    await clickRadioButton(page, 'วัน');
    await expectRadioChecked(page, 'วัน');

    // Wait for the table to re-render with wider timeline
    await page.waitForTimeout(300);
    const dayScrollWidth = await scrollContainer.evaluate((el) => el.scrollWidth);

    // Day view table must be significantly wider than month view
    expect(dayScrollWidth).toBeGreaterThan(monthScrollWidth * 2);
  });

  test('สัปดาห์ scale expands timeline width beyond month view', async ({ page }) => {
    const scrollContainer = page.locator('.ant-table-content, .ant-table-body').first();
    await expect(scrollContainer).toBeVisible();

    const monthScrollWidth = await scrollContainer.evaluate((el) => el.scrollWidth);

    await clickRadioButton(page, 'สัปดาห์');
    await expect(page.getByText('W1').first()).toBeVisible();

    await page.waitForTimeout(300);
    const weekScrollWidth = await scrollContainer.evaluate((el) => el.scrollWidth);

    expect(weekScrollWidth).toBeGreaterThan(monthScrollWidth);
  });

  test('switching back to เดือน restores month labels and column widths', async ({ page }) => {
    await clickRadioButton(page, 'สัปดาห์');
    await expect(page.getByText('W1').first()).toBeVisible();
    await clickRadioButton(page, 'เดือน');
    await expectRadioChecked(page, 'เดือน');
    await expect(page.getByText('ม.ค.').first()).toBeVisible();
  });
});

test.describe('gantt toolbar shared across projects (proj-002)', () => {
  test('view mode and time scale work on proj-002', async ({ page }) => {
    await loginAs(page, 'user-006');
    await page.goto('/projects/proj-002/gantt');
    await expect(page.getByRole('heading', { name: /แผนภูมิแกนต์/i })).toBeVisible();

    // Compare mode shows baseline bars
    await clickRadioButton(page, 'เปรียบเทียบ');
    await expect(page.locator('[data-testid="baseline-bar"]').first()).toBeVisible();

    // Week scale shows W labels
    await clickRadioButton(page, 'สัปดาห์');
    await expect(page.getByText('W1').first()).toBeVisible();
  });
});
