/**
 * PR-24 — Terms-of-Reference (TOR) document attached to a ProcurementPackage.
 *
 * One TOR row per version. `version` increments by 1 each time a new
 * revision is filed; the most-recently-approved version is canonical
 * (`approvedAt` is non-null). The actual PDF (if any) is resolved by
 * `documentFileId` against the existing DocumentFile registry.
 *
 * Fields are deliberately free-text — this is a register / metadata table,
 * not a full template engine. The four sub-sections (scope, technical,
 * delivery schedule, evaluation criteria) mirror the standard RID TOR
 * structure but are not validated for content.
 */

export interface TorDocument {
  id: string;
  procurementPackageId: string;
  /** Monotonically-increasing revision number, starts at 1. */
  version: number;
  /** Free-text scope summary in Thai (with English in parens where useful). */
  scopeSummary: string;
  technicalRequirements: string;
  deliverySchedule: string;
  evaluationCriteria: string;
  /** Optional pointer to a DocumentFile.id holding the attached PDF. */
  documentFileId: string | null;
  /** ISO date string (CE) when this revision was approved; null = draft. */
  approvedAt: string | null;
}
