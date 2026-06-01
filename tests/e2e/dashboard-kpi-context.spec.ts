import { expect, test } from '@playwright/test';

/**
 * P-C1 — context-framed KPI E2E.
 *
 * Two guarantees this spec encodes:
 *
 * 1. The dashboard portfolio KPI row exposes a bilingual freshness label
 *    derived from real `lifecycleStageHistory[*].enteredAt` (replaces the
 *    previously-empty subtitle on the first card).
 *
 * 2. The executive page header replaces the hardcoded "อัปเดตล่าสุด
 *    15/07/2569 14:30" timestamp with a derived freshness string.
 */

async function loginAs(page: import('@playwright/test').Page, userId: string) {
  await page.goto('/login');
  await page.locator(`input[type="radio"][value="${userId}"]`).check();
  await page.getByRole('button', { name: 'เข้าสู่ระบบ' }).click();
  await page.waitForURL('**/dashboard');
}

test.describe('PR-C1 KPI context + freshness', () => {
  test('portfolio dashboard shows bilingual freshness label on KPI row', async ({ page }) => {
    await loginAs(page, 'user-002');
    await page.goto('/dashboard');

    // The KPICard's aria-labelled freshness slot carries the Thai text plus
    // the English suffix, eg "อัปเดต X (Updated …)". Either days/hours/minutes
    // form is acceptable depending on seed timestamps.
    const freshness = page.getByLabel(/Data freshness/).first();
    await expect(freshness).toBeVisible();
    const text = (await freshness.textContent()) ?? '';
    expect(text).toMatch(/อัปเดต/);
    expect(text).toMatch(/Updated|ago|Just now|No update info/);
  });

  test('executive header replaces hardcoded timestamp with derived freshness', async ({
    page,
  }) => {
    await loginAs(page, 'user-001');
    await page.goto('/executive');

    // The previous hardcoded line was "อัปเดตล่าสุด: 15/07/2569 14:30".
    // The new line uses the `อัปเดต…` Thai prefix from formatFreshnessLabel.
    await expect(page.getByText(/อัปเดต/).first()).toBeVisible();
    await expect(page.getByText('15/07/2569 14:30')).toHaveCount(0);
  });
});
