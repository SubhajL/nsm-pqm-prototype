/**
 * PR-27 — Project approval workflow entity.
 *
 * The project-approval workflow models the gate that wraps a brand-new
 * project from `submitted` (just created by the requester) through
 * pm_review → bureau_review → committee_review → approved. Each step is
 * decided by an actor whose role satisfies the corresponding authority
 * tier from `src/lib/rid/approval-authority.ts` (PR-14):
 *
 *   - pm_review        — Project Manager / System Admin
 *   - bureau_review    — Project Manager / System Admin (placeholder; the
 *                        MVP role table treats PM as bureau-equivalent)
 *   - committee_review — System Admin (until RID confirms a richer
 *                        committee-member role; PR-14 §approval-authority)
 *
 * Negative outcomes:
 *   - `rejected`  — final, with rationale in the last decision entry
 *   - `withdrawn` — submitter cancelled before any approval landed
 *
 * `decisionHistory` is append-only — every state transition records who
 * decided, when, and why. The audit trail mirrors what is also written
 * into the `audit_events` table by `recordAuditEvent`.
 */

export const APPROVAL_REQUEST_STATES = [
  'submitted',
  'pm_review',
  'bureau_review',
  'committee_review',
  'approved',
  'rejected',
  'withdrawn',
] as const;
export type ApprovalRequestState = (typeof APPROVAL_REQUEST_STATES)[number];

/**
 * Approver role tiers, mirroring `ApprovalAuthority` in
 * `src/lib/rid/approval-authority.ts` but expressed in the lighter
 * vocabulary the workflow router uses.
 */
export type ApprovalRequestApproverRole = 'pm' | 'bureau_head' | 'committee';

export interface ApprovalDecision {
  /** User id of the decision-maker. */
  decidedBy: string;
  /** ISO 8601 timestamp. */
  decidedAt: string;
  decision: 'approve' | 'reject' | 'request_changes';
  /** Free-text rationale. Empty string allowed (UI should encourage). */
  comment: string;
}

export interface ProjectApprovalRequest {
  id: string;
  projectId: string;
  /** User id of the submitter. */
  submittedBy: string;
  /** ISO 8601 timestamp of initial submission. */
  submittedAt: string;
  state: ApprovalRequestState;
  /**
   * Role required to act on the current state. `null` once the request
   * is in a terminal state (approved | rejected | withdrawn).
   */
  currentApproverRole: ApprovalRequestApproverRole | null;
  /** Append-only history. The latest entry corresponds to the current state. */
  decisionHistory: ApprovalDecision[];
  /** Submitter notes captured at create time. */
  notes: string;
}

export const APPROVAL_REQUEST_STATE_LABELS: Record<
  ApprovalRequestState,
  { th: string; en: string; color: string }
> = {
  submitted: { th: 'ส่งคำขอแล้ว', en: 'Submitted', color: 'default' },
  pm_review: { th: 'รอผู้จัดการโครงการพิจารณา', en: 'PM Review', color: 'processing' },
  bureau_review: { th: 'รอกองพิจารณา', en: 'Bureau Review', color: 'processing' },
  committee_review: { th: 'รอคณะกรรมการพิจารณา', en: 'Committee Review', color: 'processing' },
  approved: { th: 'อนุมัติแล้ว', en: 'Approved', color: 'success' },
  rejected: { th: 'ไม่อนุมัติ', en: 'Rejected', color: 'error' },
  withdrawn: { th: 'ยกเลิกคำขอ', en: 'Withdrawn', color: 'warning' },
};
