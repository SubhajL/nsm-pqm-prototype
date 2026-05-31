/**
 * PR-25 — Environmental Assessment register entity.
 *
 * Captures the EIA / IEE / environmental-checklist record gating
 * construction entry. Status progresses
 * `not_started → in_progress → approved | rejected`.
 *
 * The lifecycle gate (see `src/lib/rid/lifecycle-artifacts.ts`) checks the
 * presence of a linked clearance document, NOT this row directly — the
 * register is the operator-facing summary; the gate trusts the document
 * attachment.
 */

export const EIA_STATUSES = [
  'not_started',
  'in_progress',
  'approved',
  'rejected',
] as const;
export type EiaStatus = (typeof EIA_STATUSES)[number];

export type EnvironmentalAssessmentKind =
  | 'EIA'
  | 'IEE'
  | 'environmental_checklist';

export interface EnvironmentalAssessment {
  id: string;
  projectId: string;
  kind: EnvironmentalAssessmentKind;
  status: EiaStatus;
  /** ISO date string (CE) or null when not yet approved. */
  approvedAt: string | null;
  /** Government approval document id/number, or null when none. */
  approvalReference: string | null;
  notes: string;
}

export const EIA_STATUS_LABELS: Record<
  EiaStatus,
  { th: string; en: string; color: string }
> = {
  not_started: { th: 'ยังไม่เริ่ม', en: 'Not Started', color: 'default' },
  in_progress: { th: 'กำลังดำเนินการ', en: 'In Progress', color: 'processing' },
  approved: { th: 'อนุมัติแล้ว', en: 'Approved', color: 'success' },
  rejected: { th: 'ไม่อนุมัติ', en: 'Rejected', color: 'error' },
};
