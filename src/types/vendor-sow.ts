/**
 * PR-30a — Vendor Statement of Work (SOW) entity.
 *
 * One `VendorSow` row per contractually-defined phase of vendor work on an
 * IT-class project. The SOW captures:
 *   - Scope summary for the phase.
 *   - UAT (user acceptance test) criteria — free-text bullet list.
 *   - Optional link to a PR-24 `AwardedContract` (the `contractId` is a
 *     denormalised text id; no FK constraint).
 *   - Warranty period in months (post-acceptance defect liability).
 *   - Workflow `state` machine.
 *   - `signedAt` / `acceptedAt` timestamps.
 *
 * Workflow:
 *   draft → agreed → in_delivery → uat → accepted | rejected
 *   rejected → in_delivery (rework path)
 *
 * `accepted` is terminal. `rejected` is recoverable (the vendor reworks
 * deliverables and re-enters `in_delivery`).
 *
 * Behind RID's DT6 (Digital Project Management Document) — the IT-class
 * surface is gated at the route layer via 422 `IT_ONLY_FEATURE`.
 */

export const SOW_STATES = [
  'draft',
  'agreed',
  'in_delivery',
  'uat',
  'accepted',
  'rejected',
] as const;

export type SowState = (typeof SOW_STATES)[number];

export interface VendorSow {
  id: string;
  projectId: string;
  /**
   * Optional link to a PR-24 `AwardedContract` (denormalised id; no FK).
   * Null when the SOW exists ahead of contract registration.
   */
  contractId: string | null;
  /** Human-readable phase label, e.g. "Phase 1 - SRS". */
  phase: string;
  scopeSummary: string;
  /** Free-text bullet list of UAT acceptance criteria. */
  uatCriteria: string;
  /** Defect-liability period in months; null when not stipulated. */
  warrantyMonths: number | null;
  state: SowState;
  /** ISO 8601 timestamp the SOW reached `agreed` (vendor + RID both signed). */
  signedAt: string | null;
  /** ISO 8601 timestamp the SOW was UAT-accepted. */
  acceptedAt: string | null;
  notes: string;
}

export const SOW_STATE_LABELS: Record<
  SowState,
  { th: string; en: string; color: string }
> = {
  draft: { th: 'ร่าง', en: 'Draft', color: 'default' },
  agreed: { th: 'ตกลงร่วม', en: 'Agreed', color: 'processing' },
  in_delivery: { th: 'กำลังส่งมอบ', en: 'In Delivery', color: 'processing' },
  uat: { th: 'อยู่ระหว่าง UAT', en: 'UAT', color: 'processing' },
  accepted: { th: 'รับมอบแล้ว', en: 'Accepted', color: 'success' },
  rejected: { th: 'ไม่ผ่าน UAT', en: 'Rejected', color: 'error' },
};
