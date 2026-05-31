/**
 * PR-23 — งวดงาน (work period) entity.
 *
 * A `WorkPeriod` is a contractually-defined slice of project work that
 * carries its own deliverable checklist, delivery slip (ใบส่งมอบงาน),
 * committee inspection, and payment voucher. It is the granular unit of
 * progress + payment in the RID delivery flow.
 *
 * Lifecycle (`WorkPeriodState`) is delivery-method driven and enforced by
 * the pure state machine in `src/lib/rid/work-period-state-machine.ts`.
 *
 *   - `in_house` skips committee inspection
 *     (`planned → in_progress → submitted → payment_requested → approved → disbursed`).
 *   - `outsourced` and `consultant_supervised` go through inspection
 *     (`… → submitted → inspection_passed → payment_requested → …`).
 *   - `inspection_failed` is a recoverable state — the only legal exit is
 *     back to `in_progress` (rework).
 *   - `cancelled` is terminal from anywhere.
 *
 * Behind feature flag `FEATURE_RID_PAYMENT_FLOW` — entity + persistence
 * are always wired so DB shape is stable; route + UI surfaces gate on the
 * flag.
 */

export const WORK_PERIOD_STATES = [
  'planned',
  'in_progress',
  'submitted',
  'inspection_passed',
  'inspection_failed',
  'payment_requested',
  'payment_approved',
  'payment_disbursed',
  'cancelled',
] as const;

export type WorkPeriodState = (typeof WORK_PERIOD_STATES)[number];

export interface WorkPeriod {
  id: string;
  projectId: string;
  /** Optional link to an existing `Milestone` if the งวด aligns with one. */
  milestoneId: string | null;
  /** งวดที่ N — human-readable ordinal. */
  number: number;
  title: string;
  /** Deliverable checklist; one entry per item. */
  deliverables: string[];
  /** ISO 8601 (CE) date. */
  plannedStartDate: string;
  /** ISO 8601 (CE) date. */
  plannedEndDate: string;
  /** Amount in THB. */
  amount: number;
  /** Percentage of project budget this งวด represents. */
  percentage: number;
  state: WorkPeriodState;
  createdAt: string;
  updatedAt: string;
}

export const WORK_PERIOD_STATE_LABELS: Record<
  WorkPeriodState,
  { th: string; en: string; color: string }
> = {
  planned: { th: 'วางแผน', en: 'Planned', color: 'default' },
  in_progress: { th: 'กำลังดำเนินการ', en: 'In Progress', color: 'processing' },
  submitted: { th: 'ส่งมอบงานแล้ว', en: 'Submitted', color: 'processing' },
  inspection_passed: { th: 'ตรวจรับผ่าน', en: 'Inspection Passed', color: 'success' },
  inspection_failed: { th: 'ตรวจรับไม่ผ่าน', en: 'Inspection Failed', color: 'error' },
  payment_requested: { th: 'ขอเบิกเงิน', en: 'Payment Requested', color: 'processing' },
  payment_approved: { th: 'อนุมัติเบิก', en: 'Payment Approved', color: 'success' },
  payment_disbursed: { th: 'จ่ายเงินแล้ว', en: 'Payment Disbursed', color: 'success' },
  cancelled: { th: 'ยกเลิก', en: 'Cancelled', color: 'default' },
};
