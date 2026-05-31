/**
 * PR-24 — Engineering estimate (ราคากลาง) for a ProcurementPackage.
 *
 * Captures the cost basis used to derive the budget ceiling. `boqId`
 * optionally links to the upstream BOQ; when omitted, the estimate is a
 * standalone lump-sum or cost-plus calculation.
 *
 * `basis` is one of three modelling strategies:
 *   - `unit_price`  — quantity × unit-rate (typical BOQ-driven estimate)
 *   - `cost_plus`   — direct costs + fixed markup
 *   - `lump_sum`    — total only, no item-level breakdown
 *
 * Compatibility with a downstream `AwardedContract.contractingModel` is
 * checked by `isEstimateBasisCompatible()` in
 * `src/lib/rid/procurement-helpers.ts`.
 */

export const ENGINEERING_ESTIMATE_BASES = [
  'unit_price',
  'cost_plus',
  'lump_sum',
] as const;
export type EngineeringEstimateBasis = (typeof ENGINEERING_ESTIMATE_BASES)[number];

export interface EngineeringEstimate {
  id: string;
  procurementPackageId: string;
  /** Optional link to BOQ.id; null when the estimate is not BOQ-derived. */
  boqId: string | null;
  basis: EngineeringEstimateBasis;
  /** Total estimated cost in THB (sum of items + contingency). */
  estimatedTotal: number;
  /** Contingency markup as a fraction (0.10 = 10%). */
  contingencyPercent: number;
  /** User.id of the engineer who produced the estimate. */
  estimatedBy: string;
  /** ISO date string (CE) when the estimate was finalised. */
  estimatedAt: string;
  notes: string;
}
