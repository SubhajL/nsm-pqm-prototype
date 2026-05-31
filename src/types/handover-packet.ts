/**
 * PR-26 — Handover packet (เอกสารส่งมอบ-รับมอบ) entity.
 *
 * One row per RID SOP 8.1 handover packet. Each packet aggregates the
 * artifact set required to transition a project out of `construction` and
 * into `om`: as-built drawings, the O&M manual catalogue, and asset
 * registrations.
 *
 * Lifecycle (`HandoverState`):
 *   draft → submitted → committee_review → accepted
 *                                       ↘ rejected → draft (revise)
 *
 * `contractId` denormalises the link back to the awarded contract so the
 * warranty window can be derived from the contract's `warrantyMonths`
 * without joining across PR-24 territory. The field is a plain text id
 * (no FK) to keep cross-PR migration ordering independent — matches the
 * convention used for `work_periods.milestone_id`, etc.
 *
 * `acceptedAt` is the timestamp the committee accepted the packet; it
 * becomes the warranty-start anchor when `contractId` resolves to a
 * contract with `warrantyMonths` set.
 */

export const HANDOVER_STATES = [
  'draft',
  'submitted',
  'committee_review',
  'accepted',
  'rejected',
] as const;
export type HandoverState = (typeof HANDOVER_STATES)[number];

export interface HandoverPacket {
  id: string;
  projectId: string;
  /** Optional link to the AwardedContract (PR-24) backing the warranty terms. */
  contractId: string | null;
  state: HandoverState;
  /** ISO 8601 timestamp when the packet was first submitted; null while draft. */
  submittedAt: string | null;
  /** ISO 8601 timestamp when the committee accepted the packet; null until then. */
  acceptedAt: string | null;
  /** ISO 8601 date when the warranty window starts. Derived at acceptance time. */
  warrantyStartDate: string | null;
  /** ISO 8601 date when the warranty window ends. Derived at acceptance time. */
  warrantyEndDate: string | null;
  /** `User.id` of the accepting committee member; null until accepted. */
  acceptedBy: string | null;
  /** Free-text notes from the committee or revising team. */
  notes: string;
}

export const HANDOVER_STATE_LABELS: Record<
  HandoverState,
  { th: string; en: string; color: string }
> = {
  draft: { th: 'ร่าง', en: 'Draft', color: 'default' },
  submitted: { th: 'ส่งมอบแล้ว', en: 'Submitted', color: 'processing' },
  committee_review: {
    th: 'คณะกรรมการตรวจรับ',
    en: 'Committee Review',
    color: 'processing',
  },
  accepted: { th: 'รับมอบงานแล้ว', en: 'Accepted', color: 'success' },
  rejected: { th: 'ปฏิเสธ — แก้ไข', en: 'Rejected', color: 'error' },
};
