/**
 * PR-23 — Committee inspection record (การตรวจรับงานโดยคณะกรรมการ).
 *
 * Distinct from `InspectionRecord` in `src/types/quality.ts` — that
 * type models ITP/QC inspections during execution; this type models
 * the committee receive-of-work inspection that occurs at the end of a
 * `WorkPeriod` and gates payment release for outsourced /
 * consultant-supervised projects.
 *
 * Lifecycle: created with `result='pass' | 'fail' | 'pass_with_conditions'`
 * at inspection time. The pure state machine consumes the result via the
 * work-period state transition (committee writes the record, then
 * transitions the `WorkPeriod` to `inspection_passed` or
 * `inspection_failed`).
 */

export const COMMITTEE_INSPECTION_RESULTS = [
  'pass',
  'fail',
  'pass_with_conditions',
] as const;
export type CommitteeInspectionResult =
  (typeof COMMITTEE_INSPECTION_RESULTS)[number];

export interface CommitteeInspection {
  id: string;
  workPeriodId: string;
  /** ISO 8601 timestamp. */
  inspectedAt: string;
  /** `User.id` of each committee member who performed the inspection. */
  inspectors: string[];
  result: CommitteeInspectionResult;
  /** Free text. For `pass_with_conditions`, lists the conditions. */
  conditions: string;
  /** `DocumentFile.id` references attached to the record. */
  documentIds: string[];
}
