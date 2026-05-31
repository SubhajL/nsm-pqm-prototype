/**
 * PR-23 — Pure WorkPeriod state-machine helper.
 *
 * The state machine encodes RID's three-rail delivery flow:
 *
 *   in_house        : planned → in_progress → submitted → payment_requested
 *                     → payment_approved → payment_disbursed
 *
 *   outsourced /    : planned → in_progress → submitted → inspection_passed
 *   consultant        → payment_requested → payment_approved → payment_disbursed
 *   supervised        (or submitted → inspection_failed → in_progress, rework)
 *
 * Cross-cutting rules (apply to every rail):
 *
 *   - `inspection_failed → in_progress` is the only legal exit from
 *     `inspection_failed`; the work must be re-done before re-submission.
 *   - `cancelled` is reachable from every non-terminal state and is itself
 *     terminal (no exit). `payment_disbursed` is also terminal.
 *   - Self-transitions are rejected (the caller's intent is suspicious).
 *
 * Decisions return a structured `{ ok: true } | { ok: false; reason }`
 * shape so callers can surface the reason in audit events / 409 envelopes.
 *
 * This module is intentionally pure (no I/O, no Date) so it composes
 * cleanly under the route layer and the test matrix runs in milliseconds.
 */

import type { DeliveryMethod } from '@/types/rid/vocabulary';
import type { PaymentVoucherState } from '@/types/payment-voucher';
import type { WorkPeriodState } from '@/types/work-period';

export type StateMachineDecision =
  | { ok: true }
  | { ok: false; reason: string };

const TERMINAL_STATES: ReadonlySet<WorkPeriodState> = new Set<WorkPeriodState>([
  'payment_disbursed',
  'cancelled',
]);

/**
 * `from → to` adjacencies that hold regardless of delivery method.
 * Anything that involves the `inspection_*` states is excluded here and
 * handled per-rail below so the rule can be inspected at a glance.
 */
const SHARED_ADJACENCIES: ReadonlyArray<readonly [WorkPeriodState, WorkPeriodState]> = [
  ['planned', 'in_progress'],
  ['in_progress', 'submitted'],
  ['inspection_failed', 'in_progress'],
  ['payment_requested', 'payment_approved'],
  ['payment_approved', 'payment_disbursed'],
];

/**
 * `from → to` adjacencies that exist only on `in_house` (the
 * skip-inspection rail).
 */
const IN_HOUSE_ADJACENCIES: ReadonlyArray<readonly [WorkPeriodState, WorkPeriodState]> = [
  ['submitted', 'payment_requested'],
];

/**
 * `from → to` adjacencies that exist only on `outsourced` and
 * `consultant_supervised` (the committee-inspection rails).
 */
const INSPECTION_REQUIRED_ADJACENCIES: ReadonlyArray<readonly [WorkPeriodState, WorkPeriodState]> = [
  ['submitted', 'inspection_passed'],
  ['submitted', 'inspection_failed'],
  ['inspection_passed', 'payment_requested'],
];

function adjacenciesFor(
  deliveryMethod: DeliveryMethod,
): ReadonlyArray<readonly [WorkPeriodState, WorkPeriodState]> {
  if (deliveryMethod === 'in_house') {
    return [...SHARED_ADJACENCIES, ...IN_HOUSE_ADJACENCIES];
  }
  return [...SHARED_ADJACENCIES, ...INSPECTION_REQUIRED_ADJACENCIES];
}

/**
 * Decide whether a `WorkPeriod` may transition from `from` to `to`
 * given its parent project's `deliveryMethod`.
 *
 * Pure — does not touch the database, the clock, or any other side
 * effect. Callers are expected to handle the actual write + audit event
 * once the decision is `{ ok: true }`.
 */
export function canTransitionWorkPeriod(
  from: WorkPeriodState,
  to: WorkPeriodState,
  deliveryMethod: DeliveryMethod,
): StateMachineDecision {
  if (from === to) {
    return {
      ok: false,
      reason: `Self-transition rejected (state "${from}" is unchanged).`,
    };
  }

  // Terminal states: cancelled + payment_disbursed cannot move anywhere
  // (except into themselves, which the self-transition guard above
  // already rejects).
  if (TERMINAL_STATES.has(from)) {
    return {
      ok: false,
      reason: `State "${from}" is terminal; transitions are not permitted.`,
    };
  }

  // Cancellation is reachable from every non-terminal state. Putting
  // this before the adjacency lookup keeps the per-rail tables narrow.
  if (to === 'cancelled') {
    return { ok: true };
  }

  const allowed = adjacenciesFor(deliveryMethod);
  const match = allowed.some(([a, b]) => a === from && b === to);
  if (match) {
    return { ok: true };
  }

  return {
    ok: false,
    reason:
      deliveryMethod === 'in_house' && (to === 'inspection_passed' || to === 'inspection_failed')
        ? `Delivery method "in_house" skips committee inspection — "${to}" is unreachable.`
        : `No legal "${from}" → "${to}" transition for delivery method "${deliveryMethod}".`,
  };
}

/* ============================================================================
 * Payment voucher state machine (added post-rebase per senior g-check).
 *
 * Before this helper, `PATCH /api/payment-vouchers/[workPeriodId]` accepted
 * any value of the `PaymentVoucherState` enum and persisted it directly,
 * which permitted illegal moves such as `draft → paid` (skip approval) or
 * `paid → draft` (reverse a disbursed payment). Routing all writes through
 * this matrix closes that gap.
 *
 * The voucher lifecycle is a strict finance-approval flow, NOT a graph:
 *
 *   draft → submitted → approved → paid          (happy path; paid is terminal)
 *           submitted → rejected → draft         (revise + resubmit)
 *
 * `paid` is terminal. `rejected` is not terminal — finance can revise and
 * resubmit by routing back through `draft`. Self-transitions are rejected
 * to surface unintended caller behaviour.
 * ========================================================================== */

const VOUCHER_TERMINAL_STATES: ReadonlySet<PaymentVoucherState> = new Set<PaymentVoucherState>([
  'paid',
]);

const VOUCHER_ADJACENCIES: ReadonlyArray<readonly [PaymentVoucherState, PaymentVoucherState]> = [
  ['draft', 'submitted'],
  ['submitted', 'approved'],
  ['submitted', 'rejected'],
  ['approved', 'paid'],
  ['rejected', 'draft'],
];

/**
 * Decide whether a `PaymentVoucher` may transition from `from` to `to`.
 * Pure — no I/O. Mirrors the shape of `canTransitionWorkPeriod` so the
 * route layer can call both uniformly.
 */
export function canTransitionPaymentVoucher(
  from: PaymentVoucherState,
  to: PaymentVoucherState,
): StateMachineDecision {
  if (from === to) {
    return {
      ok: false,
      reason: `Self-transition rejected (state "${from}" is unchanged).`,
    };
  }

  if (VOUCHER_TERMINAL_STATES.has(from)) {
    return {
      ok: false,
      reason: `State "${from}" is terminal; transitions are not permitted.`,
    };
  }

  const match = VOUCHER_ADJACENCIES.some(([a, b]) => a === from && b === to);
  if (match) {
    return { ok: true };
  }

  return {
    ok: false,
    reason: `No legal "${from}" → "${to}" payment-voucher transition.`,
  };
}

/* ============================================================================
 * Evidence-record requirements (added post-rebase per senior g-check).
 *
 * The work-period state graph alone is not strong enough — it accepts
 * `in_progress → submitted` without checking that a delivery slip was
 * filed, accepts entry to inspection states without a committee
 * inspection record, and accepts payment states without a voucher.
 *
 * `evidenceRequirementForState(target)` is the pure side of that gate.
 * The route layer combines this with a repository lookup: if the target
 * state requires evidence and no record exists for the work period, the
 * route rejects with `409 EVIDENCE_REQUIRED`.
 *
 * Returns `null` when the target state has no evidence requirement.
 * ========================================================================== */

export type WorkPeriodEvidenceKind =
  | 'delivery_slip'
  | 'committee_inspection'
  | 'payment_voucher';

export function evidenceRequirementForState(
  target: WorkPeriodState,
): WorkPeriodEvidenceKind | null {
  switch (target) {
    case 'submitted':
      return 'delivery_slip';
    case 'inspection_passed':
    case 'inspection_failed':
      return 'committee_inspection';
    case 'payment_requested':
    case 'payment_approved':
    case 'payment_disbursed':
      return 'payment_voucher';
    default:
      return null;
  }
}
