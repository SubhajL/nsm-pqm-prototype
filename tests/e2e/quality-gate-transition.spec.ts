import { expect, test } from '@playwright/test';

/**
 * PR-PRQM-K — Quality gate transition E2E.
 *
 * Verifies the per-gate "ผ่าน (Pass)" + "มีเงื่อนไข (Conditional)" buttons
 * on the QualityGatePipeline:
 *   1. PM logs in and lands on /projects/proj-001/quality.
 *   2. The pending gate G5 carries both action buttons.
 *   3. Clicking "ผ่าน" advances the gate to passed; the success toast
 *      surfaces; reload preserves the state.
 */

async function loginAs(page: import('@playwright/test').Page, userId: string) {
  await page.goto('/login');
  await page.locator(`input[type="radio"][value="${userId}"]`).check();
  await page.getByRole('button', { name: 'เข้าสู่ระบบ' }).click();
  await page.waitForURL('**/dashboard');
}

test.describe('quality gate transition (proj-001)', () => {
  test('PM transitions G5 (pending → passed) and the change persists across reload', async ({
    page,
  }) => {
    await loginAs(page, 'user-002'); // Project Manager
    await page.goto('/projects/proj-001/quality');
    await expect(
      page.getByRole('heading', { name: /Quality Management/i }),
    ).toBeVisible();

    // G5 in the seed data starts as `pending`. With manage permissions
    // both action buttons should be present for this gate.
    const passButton = page.getByRole('button', {
      name: 'Gate 5: ผ่าน (Pass)',
    });
    await expect(passButton).toBeVisible();

    await passButton.click();

    // Antd success toast confirms persistence.
    await expect(page.getByText(/บันทึก Gate 5 แล้ว/)).toBeVisible();

    // Reload — the gate should still reflect the passed status (the pass
    // button is no longer offered because passed is terminal).
    await page.reload();
    await expect(
      page.getByRole('heading', { name: /Quality Management/i }),
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'Gate 5: ผ่าน (Pass)' }),
    ).toHaveCount(0);
  });

  test('Executive (read-only) does not see per-gate action buttons', async ({ page }) => {
    await loginAs(page, 'user-007'); // Executive — no edit_quality_inspection
    await page.goto('/projects/proj-001/quality');
    await expect(
      page.getByRole('heading', { name: /Quality Management/i }),
    ).toBeVisible();

    // Action buttons should not appear at all for read-only roles.
    await expect(
      page.getByRole('button', { name: /^Gate \d+: ผ่าน \(Pass\)$/ }),
    ).toHaveCount(0);
    await expect(
      page.getByRole('button', { name: /^Gate \d+: มีเงื่อนไข \(Conditional\)$/ }),
    ).toHaveCount(0);
  });
});
