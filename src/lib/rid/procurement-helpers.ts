/**
 * PR-24 — Pure helpers for the procurement / contract domain.
 *
 * Three concerns live here:
 *   1. `canTransitionProcurement` — the ProcurementPackage state machine.
 *   2. `isEstimateBasisCompatible` — guard against estimating on one basis
 *      and contracting on another that the basis can't price.
 *   3. `applyAmendmentToContract` — additive math that derives an
 *      AwardedContract's effective amount + expiration after one amendment.
 *
 * Everything in this module is pure (no I/O, no clock, no randomness). Date
 * arithmetic uses native `Date` constructor — ISO date strings round-trip
 * losslessly across the UTC boundary because we only care about whole-day
 * offsets.
 */

import type { AwardedContract } from '@/types/awarded-contract';
import type { ContractAmendment } from '@/types/contract-amendment';
import type {
  EngineeringEstimate,
  EngineeringEstimateBasis,
} from '@/types/engineering-estimate';
import type { ProcurementState } from '@/types/procurement-package';

/**
 * Adjacency list for the ProcurementPackage state machine. Every key →
 * set of legal target states. Absent keys (or empty sets) are terminal.
 *
 * Per spec:
 *   - `draft` → `tor_review` | `cancelled`
 *   - `tor_review` → `tender_open` | `cancelled`
 *   - `tender_open` → `evaluation` | `cancelled`
 *   - `evaluation` → `awarded` | `cancelled`
 *   - `awarded` (terminal — amendments live in their own table)
 *   - `cancelled` (absorbing terminal)
 */
const PROCUREMENT_TRANSITIONS: Record<ProcurementState, readonly ProcurementState[]> = {
  draft: ['tor_review', 'cancelled'],
  tor_review: ['tender_open', 'cancelled'],
  tender_open: ['evaluation', 'cancelled'],
  evaluation: ['awarded', 'cancelled'],
  awarded: [],
  cancelled: [],
};

export type TransitionResult =
  | { ok: true }
  | { ok: false; reason: string };

/**
 * Whether a ProcurementPackage may move from `from` to `to`.
 *
 * Returns a discriminated result so callers (API routes, repositories) can
 * surface the rejection reason in their error envelope without a second
 * lookup. Self-transitions are rejected — moving to the same state is never
 * a meaningful workflow event.
 */
export function canTransitionProcurement(
  from: ProcurementState,
  to: ProcurementState,
): TransitionResult {
  if (from === to) {
    return { ok: false, reason: `Already in state '${from}'; no-op transition not allowed.` };
  }
  const allowed = PROCUREMENT_TRANSITIONS[from];
  if (allowed.length === 0) {
    return {
      ok: false,
      reason: `State '${from}' is terminal; no further transitions are permitted.`,
    };
  }
  if (!allowed.includes(to)) {
    return {
      ok: false,
      reason: `Transition from '${from}' to '${to}' is not allowed; legal next states are: ${allowed.join(', ')}.`,
    };
  }
  return { ok: true };
}

/**
 * Compatibility matrix between EngineeringEstimate.basis and the eventual
 * AwardedContract.contractingModel. Keys are estimate bases; values are the
 * set of contracting models that can be priced from that basis.
 *
 *   - `unit_price` estimates can support `unit_price`, `lump_sum`, and
 *     `design_build` contracts (BOQ is the universal pricing input).
 *   - `lump_sum` estimates only support `lump_sum` contracts (no per-item
 *     breakdown to drive variable pricing).
 *   - `cost_plus` estimates only support `cost_plus` contracts (markup
 *     structure is specific to the cost-plus model).
 */
const ESTIMATE_BASIS_COMPATIBILITY: Record<
  EngineeringEstimateBasis,
  readonly AwardedContract['contractingModel'][]
> = {
  unit_price: ['unit_price', 'lump_sum', 'design_build'],
  lump_sum: ['lump_sum'],
  cost_plus: ['cost_plus'],
};

/**
 * True iff an estimate of the given basis can serve as the pricing input
 * for an awarded contract of the given contracting model.
 */
export function isEstimateBasisCompatible(
  estimateBasis: EngineeringEstimate['basis'],
  contractingModel: AwardedContract['contractingModel'],
): boolean {
  return ESTIMATE_BASIS_COMPATIBILITY[estimateBasis].includes(contractingModel);
}

/**
 * Apply a single amendment's deltas to an AwardedContract's amount and
 * expiration date. Pure derivation — neither argument is mutated.
 *
 * Date arithmetic operates in UTC at midnight. `expirationDate` is treated
 * as `YYYY-MM-DD` (matches our ISO storage), and the result is re-encoded
 * in the same format. When the contract has no expiration date the result
 * preserves `null` regardless of `scheduleDeltaDays`.
 *
 * Composition: applying a list of amendments in order is equivalent to
 * folding this function over the list with the contract as the seed — there
 * are no carry-over effects between amendments.
 */
export function applyAmendmentToContract(
  contract: Pick<AwardedContract, 'awardAmount' | 'expirationDate'>,
  amendment: Pick<ContractAmendment, 'amountDelta' | 'scheduleDeltaDays'>,
): { effectiveAmount: number; effectiveExpirationDate: string | null } {
  const effectiveAmount = contract.awardAmount + amendment.amountDelta;
  let effectiveExpirationDate: string | null = null;
  if (contract.expirationDate !== null) {
    const dt = new Date(`${contract.expirationDate}T00:00:00.000Z`);
    dt.setUTCDate(dt.getUTCDate() + amendment.scheduleDeltaDays);
    // Re-encode as YYYY-MM-DD without time component.
    effectiveExpirationDate = dt.toISOString().slice(0, 10);
  }
  return { effectiveAmount, effectiveExpirationDate };
}
