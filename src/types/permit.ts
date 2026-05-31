/**
 * PR-25 — Permit register entity.
 *
 * Tracks regulatory permits a project must obtain (building permits,
 * environmental clearances, water-use authorisations, etc.). The shape is
 * deliberately minimal: this is a register, not a full workflow engine.
 *
 * Workflow status progresses
 * `draft → submitted → issued | rejected | expired`. The two terminal
 * "failure" states (`rejected`, `expired`) are surfaced for compliance
 * reporting but do not auto-transition — the register is human-maintained.
 */

export const PERMIT_STATUSES = [
  'draft',
  'submitted',
  'issued',
  'rejected',
  'expired',
] as const;
export type PermitStatus = (typeof PERMIT_STATUSES)[number];

export interface Permit {
  id: string;
  projectId: string;
  /** e.g. 'building', 'environmental', 'water_use'. Free text — register-style. */
  permitType: string;
  /** Bilingual "Thai (English)" label. */
  title: string;
  issuingAuthority: string;
  status: PermitStatus;
  /** ISO date string (CE) or null when not yet issued. */
  issuedAt: string | null;
  /** ISO date string (CE) or null when no expiry applies. */
  expiresAt: string | null;
  notes: string;
}

export const PERMIT_STATUS_LABELS: Record<
  PermitStatus,
  { th: string; en: string; color: string }
> = {
  draft: { th: 'ร่าง', en: 'Draft', color: 'default' },
  submitted: { th: 'ยื่นแล้ว', en: 'Submitted', color: 'processing' },
  issued: { th: 'อนุมัติแล้ว', en: 'Issued', color: 'success' },
  rejected: { th: 'ไม่อนุมัติ', en: 'Rejected', color: 'error' },
  expired: { th: 'หมดอายุ', en: 'Expired', color: 'warning' },
};
