/**
 * Pure UI helpers for the งวดงาน (work-period) payment flow.
 *
 * These wrap the client-safe state machine in
 * `src/lib/rid/work-period-state-machine.ts` so the drawer can render
 * ONLY the legal next-state buttons (and disable the ones still waiting on
 * an evidence record) without duplicating the transition graph. The
 * server route remains the final authority — it re-checks every move and
 * returns 409 on an illegal one.
 */

import {
  canTransitionPaymentVoucher,
  canTransitionWorkPeriod,
  evidenceRequirementForState,
} from '@/lib/rid/work-period-state-machine';
import {
  PAYMENT_VOUCHER_STATES,
  type PaymentVoucherState,
} from '@/types/payment-voucher';
import type { DeliveryMethod } from '@/types/rid/vocabulary';
import { WORK_PERIOD_STATES, type WorkPeriodState } from '@/types/work-period';

/** Which supporting records currently exist on a work period. */
export interface EvidencePresence {
  hasDeliverySlip: boolean;
  hasCommitteeInspection: boolean;
  /** Canonical voucher state, or null when no voucher exists yet. */
  paymentVoucherState: PaymentVoucherState | null;
}

/**
 * Parent payment states must track the voucher sub-state so a งวด can't
 * read "จ่ายเงินแล้ว" while its ฎีกา is still a draft. The server's evidence
 * rule only requires a voucher to EXIST; the UI is intentionally stricter
 * for demo coherence (the server still accepts the looser case, so this
 * never causes a 409 — it just hides incoherent buttons):
 *   payment_requested ⟵ voucher submitted | approved | paid
 *   payment_approved  ⟵ voucher approved | paid
 *   payment_disbursed ⟵ voucher paid
 */
export function paymentVoucherReadyForWorkPeriodState(
  target: WorkPeriodState,
  voucherState: PaymentVoucherState | null,
): boolean {
  if (voucherState === null) return false;
  switch (target) {
    case 'payment_requested':
      return (
        voucherState === 'submitted' ||
        voucherState === 'approved' ||
        voucherState === 'paid'
      );
    case 'payment_approved':
      return voucherState === 'approved' || voucherState === 'paid';
    case 'payment_disbursed':
      return voucherState === 'paid';
    default:
      return true;
  }
}

/**
 * Every state the work period may legally move to from `from` under the
 * project's delivery method. Excludes the self-transition. The returned
 * order follows `WORK_PERIOD_STATES` so the UI renders forward steps
 * before the trailing `cancelled` action.
 */
export function getLegalNextWorkPeriodStates(
  from: WorkPeriodState,
  deliveryMethod: DeliveryMethod,
): WorkPeriodState[] {
  return WORK_PERIOD_STATES.filter(
    (to) => to !== from && canTransitionWorkPeriod(from, to, deliveryMethod).ok,
  );
}

/** Legal next voucher states from `from` (excludes the self-transition). */
export function getLegalNextPaymentVoucherStates(
  from: PaymentVoucherState,
): PaymentVoucherState[] {
  return PAYMENT_VOUCHER_STATES.filter(
    (to) => to !== from && canTransitionPaymentVoucher(from, to).ok,
  );
}

/**
 * Whether the evidence record required to enter `target` exists yet. The
 * route enforces the same rule server-side (`409 EVIDENCE_REQUIRED`); this
 * lets the UI disable the button + show a hint instead of failing the
 * call. States with no evidence requirement are always ready.
 */
export function evidenceReadyForState(
  target: WorkPeriodState,
  presence: EvidencePresence,
): boolean {
  const kind = evidenceRequirementForState(target);
  if (kind === null) return true;
  switch (kind) {
    case 'delivery_slip':
      return presence.hasDeliverySlip;
    case 'committee_inspection':
      return presence.hasCommitteeInspection;
    case 'payment_voucher':
      return paymentVoucherReadyForWorkPeriodState(
        target,
        presence.paymentVoucherState,
      );
  }
}
