/**
 * PR-23 — ใบส่งมอบงาน (Delivery Slip).
 *
 * A contractor's hand-off artifact attached to a `WorkPeriod` when the
 * work for the period is complete. The slip references project
 * documents (drawings, photos, certificates) that back the claim and is
 * the predecessor record to the committee inspection.
 *
 * One `WorkPeriod` may carry multiple `DeliverySlip` rows in practice
 * (re-submission after `inspection_failed` rework). The state machine
 * does not enforce uniqueness — that is a policy question for PR-23+UI.
 */

export interface DeliverySlip {
  id: string;
  workPeriodId: string;
  /** ISO 8601 timestamp. */
  submittedAt: string;
  /** `User.id` of the contractor / staff submitting the slip. */
  submittedBy: string;
  /** `DocumentFile.id` references that back the deliverables. */
  attachedDocIds: string[];
  notes: string;
}
