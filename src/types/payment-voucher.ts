/**
 * PR-23 — Payment voucher (ใบเบิกจ่ายเงิน).
 *
 * One-to-one with a `WorkPeriod` (the registry helper
 * `findByWorkPeriod` enforces practical uniqueness on the read side; the
 * persistence layer does not impose a uniqueness constraint so re-issued
 * vouchers after `rejected` can coexist with the canonical record).
 *
 * State progression:
 *   `draft → submitted → approved → paid`
 *           ↘ `rejected` (terminal until a fresh voucher is created)
 *
 * `voucherNumber` is assigned by the finance team at `approved` time and
 * persisted on the row; it must remain stable across `approved → paid`.
 */

export const PAYMENT_VOUCHER_STATES = [
  'draft',
  'submitted',
  'approved',
  'paid',
  'rejected',
] as const;
export type PaymentVoucherState = (typeof PAYMENT_VOUCHER_STATES)[number];

export interface PaymentVoucher {
  id: string;
  workPeriodId: string;
  state: PaymentVoucherState;
  /** Amount requested by the contractor; THB. */
  requestedAmount: number;
  /** Amount approved by finance; null until the voucher reaches `approved`. */
  approvedAmount: number | null;
  /** Assigned at `approved` time. Null beforehand. */
  voucherNumber: string | null;
  /** ISO 8601 timestamp. Null until `paid`. */
  paidAt: string | null;
  notes: string;
}

export const PAYMENT_VOUCHER_STATE_LABELS: Record<
  PaymentVoucherState,
  { th: string; en: string; color: string }
> = {
  draft: { th: 'ร่าง', en: 'Draft', color: 'default' },
  submitted: { th: 'ยื่นแล้ว', en: 'Submitted', color: 'processing' },
  approved: { th: 'อนุมัติแล้ว', en: 'Approved', color: 'success' },
  paid: { th: 'จ่ายแล้ว', en: 'Paid', color: 'success' },
  rejected: { th: 'ไม่อนุมัติ', en: 'Rejected', color: 'error' },
};
