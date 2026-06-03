import { expect, test, type Page } from '@playwright/test';

/**
 * Bucket 2 — executive evaluation persistence E2E.
 *
 * An Executive edits the proj-005 scorecard and the change survives a full
 * reload — proving the evaluation is repository/DB-backed (it used to be a
 * hardcoded in-memory object).
 *
 * NOTE the generous timeouts: with no DATABASE_URL the dev server uses an
 * in-memory pglite that re-seeds ~20-30s per route on first hit under
 * `next dev`. Correctness, not latency, is under test.
 */

const EXEC_USER = 'user-007'; // Executive in seed.
const SLOW = { timeout: 60_000 };

async function loginAs(page: Page, userId: string) {
  await page.goto('/login');
  await page.locator(`input[type="radio"][value="${userId}"]`).check();
  await page.getByRole('button', { name: 'เข้าสู่ระบบ' }).click();
  await page.waitForURL('**/dashboard', SLOW);
}

test.describe('executive evaluation persistence', () => {
  test('an Executive edits the evaluation and it persists across reload', async ({
    page,
  }) => {
    test.setTimeout(300_000);
    const newRecommendation = `ข้อเสนอแนะทดสอบ ${Date.now()}`;

    await loginAs(page, EXEC_USER);
    await page.goto('/executive/evaluation');
    await expect(
      page.getByRole('heading', { name: /แบบประเมินโครงการ/ }),
    ).toBeVisible(SLOW);

    // Open the edit modal and change the recommendation.
    await page.getByRole('button', { name: /แก้ไขผลประเมิน/ }).click();
    const modal = page.getByRole('dialog', { name: /แก้ไขผลการประเมิน/ });
    await expect(modal).toBeVisible(SLOW);
    await modal.getByLabel('ข้อเสนอแนะ (Recommendation)').fill(newRecommendation);
    await modal.getByRole('button', { name: /บันทึก \(Save\)/ }).click();
    await expect(page.getByText('บันทึกผลการประเมินแล้ว')).toBeVisible(SLOW);

    // The page reflects the saved value immediately (query invalidation)…
    await expect(page.getByText(newRecommendation)).toBeVisible(SLOW);

    // …and it survives a full reload — proof it is DB-backed, not in-memory.
    await page.reload();
    await expect(
      page.getByRole('heading', { name: /แบบประเมินโครงการ/ }),
    ).toBeVisible(SLOW);
    await expect(page.getByText(newRecommendation)).toBeVisible(SLOW);
  });
});
