/**
 * PR-24 — Contract amendment (สัญญาแก้ไขเพิ่มเติม).
 *
 * One row per signed amendment to an AwardedContract. Amendments stack
 * additively: applying them in `amendmentNumber` order yields the
 * effective contract amount and expiration date at any given moment.
 *
 * The math is done by `applyAmendmentToContract()` in
 * `src/lib/rid/procurement-helpers.ts`. Repositories store the raw
 * deltas — derivation is the helper's job.
 */

export interface ContractAmendment {
  id: string;
  contractId: string;
  /** 1-based sequence; uniqueness per contractId is enforced by callers. */
  amendmentNumber: number;
  /** ISO date string (CE) when the amendment was signed. */
  amendedAt: string;
  /** Change in award amount (THB). May be negative (deductive amendment). */
  amountDelta: number;
  /** Change in schedule (calendar days). May be negative. */
  scheduleDeltaDays: number;
  /** Free-text justification. */
  reason: string;
  /** User.id of the approver who signed off. */
  approvedBy: string;
  documentFileId: string | null;
}
