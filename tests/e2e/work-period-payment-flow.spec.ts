import { expect, test, type Page } from '@playwright/test';

/**
 * PR work-periods — งวดงาน payment-flow E2E (proj-001, outsourced rail).
 *
 * Runs only with FEATURE_RID_PAYMENT_FLOW=true +
 * NEXT_PUBLIC_FEATURE_RID_PAYMENT_FLOW=true (set in playwright.config.ts
 * webServer). Drives the full outsourced lifecycle as a Project Manager:
 *
 *   create → in_progress → (delivery slip) → submitted
 *          → (committee pass) → inspection_passed
 *          → (payment voucher) → payment_requested
 *          → payment_approved → payment_disbursed
 *
 * NOTE the generous timeouts: with no DATABASE_URL the dev server uses an
 * in-memory pglite that lazily seeds + transactionally audits each write,
 * so the first hit of each route can take 10–30s. The assertions below
 * verify correctness, not latency.
 */

const PM_USER = 'user-002';
const PROJECT_ID = 'proj-001';
const WP_TITLE = `E2E งวดทดสอบ ${Date.now()}`;
// `next dev` with an in-memory pglite (no DATABASE_URL) re-seeds per route
// module on first hit (~10–30s each); generous waits keep this correctness
// test from flaking on that dev-only latency. Production (DATABASE_URL +
// one-time seed) does not pay this cost.
const SLOW = { timeout: 60_000 };

async function loginAs(page: Page, userId: string) {
  await page.goto('/login');
  await page.locator(`input[type="radio"][value="${userId}"]`).check();
  await page.getByRole('button', { name: 'เข้าสู่ระบบ' }).click();
  await page.waitForURL('**/dashboard', SLOW);
}

test.describe('งวดงาน payment flow (proj-001, outsourced)', () => {
  test('PM drives a work period from creation to payment disbursed', async ({ page }) => {
    test.setTimeout(480_000);

    // Advance the work period and wait for the transition toast for the
    // specific target state (avoids matching a lingering prior toast).
    const advance = async (buttonName: string, thLabel: string) => {
      await page.getByRole('button', { name: buttonName }).click();
      await expect(
        page.getByText(new RegExp(`อัปเดตงวดงานเป็น "${thLabel}"`)),
      ).toBeVisible(SLOW);
    };

    await loginAs(page, PM_USER);
    await page.goto(`/projects/${PROJECT_ID}/work-periods`);
    await expect(
      page.getByRole('heading', { name: /งวดงาน \(Work Periods\)/ }),
    ).toBeVisible(SLOW);

    // ── Create the งวดงาน via the modal ──────────────────────────────
    await page.getByRole('button', { name: /สร้างงวดงาน/ }).click();
    const modal = page.getByRole('dialog', { name: /สร้างงวดงาน/ });
    await modal.getByLabel('งวดที่ (Period No.)').fill('99');
    await modal.getByLabel('ชื่องวดงาน (Title)').fill(WP_TITLE);

    const range = modal.locator('.ant-picker-range input');
    await range.nth(0).fill('01/07/2569');
    await range.nth(0).press('Enter');
    await range.nth(1).fill('31/07/2569');
    await range.nth(1).press('Enter');

    await modal.getByLabel('มูลค่างวดงาน (Amount, บาท)').fill('1000000');
    await modal.getByLabel('สัดส่วนของงบประมาณ (% of budget)').fill('8');
    await modal.getByRole('button', { name: /สร้าง \(Create\)/ }).click();
    await expect(page.getByText('สร้างงวดงานแล้ว')).toBeVisible(SLOW);

    // ── Open the detail drawer for the new row ───────────────────────
    const row = page.getByRole('row', { name: new RegExp(WP_TITLE) });
    await row.getByRole('button', { name: /จัดการ/ }).click();
    const drawer = page.getByRole('dialog', { name: new RegExp(WP_TITLE) });
    await expect(drawer).toBeVisible(SLOW);

    // planned → in_progress
    await advance('กำลังดำเนินการ (In Progress)', 'กำลังดำเนินการ');

    // submitted is gated until a delivery slip exists.
    await expect(
      drawer.getByRole('button', { name: 'ส่งมอบงานแล้ว (Submitted)' }),
    ).toBeDisabled();
    await drawer.getByRole('button', { name: /ส่งมอบงาน \(File delivery slip\)/ }).click();
    await drawer.getByLabel('หมายเหตุ (Notes)').fill('ส่งมอบงานงวดทดสอบ');
    await drawer.getByRole('button', { name: /บันทึก \(Save\)/ }).click();
    await expect(page.getByText('บันทึกใบส่งมอบงานแล้ว')).toBeVisible(SLOW);

    // in_progress → submitted
    await advance('ส่งมอบงานแล้ว (Submitted)', 'ส่งมอบงานแล้ว');

    // inspection_passed gated until a committee inspection exists.
    const committee = drawer.getByRole('region', { name: /Committee inspection/ });
    await committee.getByRole('button', { name: /บันทึกผลตรวจรับ/ }).click();
    await committee.getByLabel('คณะกรรมการตรวจรับ (Inspectors)').fill('กรรมการ A, กรรมการ B');
    await committee.getByLabel('ผลการตรวจรับ (Result)').click();
    await page.locator('.ant-select-item-option', { hasText: 'ผ่าน (Pass)' }).click();
    await committee.getByRole('button', { name: /บันทึก \(Save\)/ }).click();
    await expect(page.getByText('บันทึกผลตรวจรับแล้ว')).toBeVisible(SLOW);

    // submitted → inspection_passed
    await advance('ตรวจรับผ่าน (Inspection Passed)', 'ตรวจรับผ่าน');

    // ── Payment voucher sub-flow, interleaved with parent payment states.
    // Each parent payment step is gated on the voucher reaching the matching
    // sub-state (draft voucher must NOT enable payment_requested). ──────────
    const voucher = drawer.getByRole('region', { name: /Payment voucher/ });
    await voucher.getByLabel('จำนวนเงินที่ขอเบิก (Requested, บาท)').fill('1000000');
    await voucher.getByRole('button', { name: /สร้างฎีกา/ }).click();
    await expect(page.getByText('สร้างฎีกาเบิกจ่ายแล้ว')).toBeVisible(SLOW);

    // A draft voucher must not yet enable the parent payment_requested step.
    await expect(
      drawer.getByRole('button', { name: 'ขอเบิกเงิน (Payment Requested)' }),
    ).toBeDisabled();

    // voucher draft → submitted, then parent inspection_passed → payment_requested
    await voucher.getByRole('button', { name: 'ยื่นฎีกา (Submit)' }).click();
    await expect(page.getByText(/อัปเดตฎีกาเป็น "ยื่นแล้ว"/)).toBeVisible(SLOW);
    await advance('ขอเบิกเงิน (Payment Requested)', 'ขอเบิกเงิน');

    // voucher submitted → approved (captures voucher no. + approved amount)
    await voucher.getByRole('button', { name: 'อนุมัติเบิก (Approve)' }).click();
    const approveModal = page.getByRole('dialog', { name: /อนุมัติฎีกาเบิกจ่าย/ });
    await approveModal.getByLabel('เลขที่ฎีกา (Voucher No.)').fill('ฎ.2569/001');
    await approveModal.getByLabel('จำนวนเงินที่อนุมัติ (Approved, บาท)').fill('1000000');
    await approveModal.getByRole('button', { name: /อนุมัติ \(Approve\)/ }).click();
    await expect(page.getByText(/อัปเดตฎีกาเป็น "อนุมัติแล้ว"/)).toBeVisible(SLOW);
    await advance('อนุมัติเบิก (Payment Approved)', 'อนุมัติเบิก');

    // voucher approved → paid, then parent payment_approved → payment_disbursed
    await voucher.getByRole('button', { name: 'จ่ายเงินแล้ว (Mark Paid)' }).click();
    await expect(page.getByText(/อัปเดตฎีกาเป็น "จ่ายแล้ว"/)).toBeVisible(SLOW);
    await advance('จ่ายเงินแล้ว (Payment Disbursed)', 'จ่ายเงินแล้ว');

    // The drawer header badge reflects the terminal state.
    await expect(
      drawer.getByText('จ่ายเงินแล้ว (Payment Disbursed)'),
    ).toBeVisible(SLOW);
  });
});
