/**
 * PR-26 — Pure helpers for the water/asset/O&M handover workflow.
 *
 * Three concerns live here:
 *
 *   1. `canTransitionHandover` — the HandoverPacket state machine
 *      (SOP 8.1: draft → submitted → committee_review →
 *      accepted | rejected; rejected → draft for revise).
 *
 *   2. `computeWarrantyWindow` — derive the warranty start/end pair from
 *      a contract's `warrantyMonths` + the packet's `acceptedAt`.
 *
 *   3. `isHandoverComplete` — SOP 8.1 minimum-artifact gate. The packet
 *      is "complete" when it has at least one as-built drawing, an
 *      entry for every O&M manual category, and at least one asset
 *      registration. Used by the transition route to gate movement
 *      into `submitted` / `committee_review` / `accepted`.
 *
 * Everything in this module is pure (no I/O, no clock, no randomness).
 * Date arithmetic uses native `Date` constructor — ISO date strings
 * round-trip losslessly across the UTC boundary because we only care
 * about whole-day offsets.
 */

import { OM_MANUAL_CATEGORIES, type OmManualCategory } from '@/types/om-manual';
import type { HandoverState } from '@/types/handover-packet';

/**
 * Adjacency list for the HandoverPacket state machine.
 *
 * Per SOP 8.1:
 *   - `draft` → `submitted`
 *   - `submitted` → `committee_review`
 *   - `committee_review` → `accepted` | `rejected`
 *   - `accepted` (absorbing terminal)
 *   - `rejected` → `draft` (revise + resubmit)
 *
 * Unlike the procurement state machine there is no `cancelled` global
 * exit — handover packets that are abandoned simply stay in `draft`.
 */
const HANDOVER_TRANSITIONS: Record<HandoverState, readonly HandoverState[]> = {
  draft: ['submitted'],
  submitted: ['committee_review'],
  committee_review: ['accepted', 'rejected'],
  accepted: [],
  rejected: ['draft'],
};

export type HandoverTransitionResult =
  | { ok: true }
  | { ok: false; reason: string };

/**
 * Whether a HandoverPacket may move from `from` to `to`.
 *
 * Returns a discriminated result so callers (API routes, repositories) can
 * surface the rejection reason in their error envelope without a second
 * lookup. Self-transitions are rejected — moving to the same state is
 * never a meaningful workflow event.
 */
export function canTransitionHandover(
  from: HandoverState,
  to: HandoverState,
): HandoverTransitionResult {
  if (from === to) {
    return {
      ok: false,
      reason: `Self-transition rejected (state "${from}" is unchanged).`,
    };
  }
  const allowed = HANDOVER_TRANSITIONS[from];
  if (allowed.length === 0) {
    return {
      ok: false,
      reason: `State "${from}" is terminal; no further transitions are permitted.`,
    };
  }
  if (!allowed.includes(to)) {
    return {
      ok: false,
      reason: `Transition from "${from}" to "${to}" is not allowed; legal next states are: ${allowed.join(', ')}.`,
    };
  }
  return { ok: true };
}

/**
 * Derive the warranty window from a contract's `warrantyMonths` and the
 * timestamp at which the handover packet was accepted.
 *
 * Returns `null` when `warrantyMonths` is null or zero (no stipulated
 * warranty). Otherwise returns `{ start, end }` where both are
 * `YYYY-MM-DD` strings.
 *
 * Date arithmetic uses UTC throughout. End-of-month roll-over is
 * handled by clamping to the last day of the resulting month (e.g.
 * 2027-01-31 + 1 month → 2027-02-28, NOT 2027-03-03). This matches
 * the user expectation that "a 1-month warranty starting on Jan 31"
 * expires on the last day of February, not in March.
 */
export function computeWarrantyWindow(
  acceptedAt: string,
  warrantyMonths: number | null,
): { start: string; end: string } | null {
  if (warrantyMonths === null || warrantyMonths <= 0) return null;

  // `acceptedAt` may be an ISO timestamp (YYYY-MM-DDTHH:MM:SSZ) or a
  // plain date — take the leading YYYY-MM-DD only.
  const startDate = acceptedAt.slice(0, 10);
  const [yStr, mStr, dStr] = startDate.split('-');
  const year = Number(yStr);
  const month = Number(mStr); // 1-12
  const day = Number(dStr);

  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) {
    return null;
  }

  // Calendar arithmetic — clamp to last-day-of-month on overflow.
  const totalMonths = (month - 1) + warrantyMonths;
  const endYear = year + Math.floor(totalMonths / 12);
  const endMonth0 = totalMonths % 12; // 0-11

  // Compute "last day of end month" by stepping into the next month
  // and walking back one day. Native Date handles leap years.
  const lastDayOfEndMonth = new Date(Date.UTC(endYear, endMonth0 + 1, 0)).getUTCDate();
  const endDay = Math.min(day, lastDayOfEndMonth);

  const end = `${endYear.toString().padStart(4, '0')}-${String(endMonth0 + 1).padStart(2, '0')}-${String(endDay).padStart(2, '0')}`;
  return { start: startDate, end };
}

export type HandoverCompletenessResult =
  | { ok: true }
  | { ok: false; missing: string[] };

/**
 * Whether a HandoverPacket has the minimum complete artifact set per
 * SOP 8.1.
 *
 * Required set (MVP):
 *   - At least one as-built drawing.
 *   - At least one O&M manual entry per `OmManualCategory`.
 *   - At least one asset registration.
 *
 * Returns `{ ok: true }` when complete, otherwise
 * `{ ok: false, missing }` where `missing` is a stable list of
 * machine-readable keys the caller can surface in a 409 envelope:
 *
 *   - `as_built_drawings`
 *   - `om_manual_<category>` (one per missing category)
 *   - `asset_registrations`
 *
 * Defensive: negative or fractional counts are treated as zero so the
 * helper cannot crash on a corrupted input snapshot.
 */
export function isHandoverComplete(input: {
  asBuiltCount: number;
  omManualCategoriesPresent: Set<OmManualCategory>;
  assetCount: number;
}): HandoverCompletenessResult {
  const missing: string[] = [];

  const asBuilt = Math.floor(Math.max(0, input.asBuiltCount));
  const assets = Math.floor(Math.max(0, input.assetCount));

  if (asBuilt < 1) missing.push('as_built_drawings');
  for (const category of OM_MANUAL_CATEGORIES) {
    if (!input.omManualCategoriesPresent.has(category)) {
      missing.push(`om_manual_${category}`);
    }
  }
  if (assets < 1) missing.push('asset_registrations');

  if (missing.length === 0) return { ok: true };
  return { ok: false, missing };
}
