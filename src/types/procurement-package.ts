/**
 * PR-24 — Procurement Package entity.
 *
 * A ProcurementPackage groups the work that a single competitive solicitation
 * (e-bidding, selection, specific-method, reverse-auction) will procure. It
 * is the upstream container that owns the Terms-of-Reference document, the
 * engineering estimate, the eventual AwardedContract, and any amendments
 * thereafter.
 *
 * Workflow status progresses
 * `draft → tor_review → tender_open → evaluation → awarded`. `cancelled` is an
 * absorbing terminal state reachable from any non-terminal stage. `awarded`
 * is terminal except via the amendment system.
 *
 * The state machine itself is enforced by `canTransitionProcurement()` in
 * `src/lib/rid/procurement-helpers.ts` — the type only declares the legal
 * vocabulary.
 */

export const PROCUREMENT_STATES = [
  'draft',
  'tor_review',
  'tender_open',
  'evaluation',
  'awarded',
  'cancelled',
] as const;
export type ProcurementState = (typeof PROCUREMENT_STATES)[number];

export const PROCUREMENT_METHODS = [
  'e_bidding',
  'specific_method',
  'selection',
  'reverse_auction',
] as const;
export type ProcurementMethod = (typeof PROCUREMENT_METHODS)[number];

export interface ProcurementPackage {
  id: string;
  projectId: string;
  /** Bilingual "Thai (English)" label. */
  name: string;
  state: ProcurementState;
  /** Ceiling price (THB) advertised in the solicitation. */
  budgetCeiling: number;
  procurementMethod: ProcurementMethod;
  /** ISO date string (CE) when the tender opened; null until then. */
  openedAt: string | null;
  /** ISO date string (CE) when the tender closed; null until then. */
  closedAt: string | null;
  notes: string;
}

export const PROCUREMENT_STATE_LABELS: Record<
  ProcurementState,
  { th: string; en: string; color: string }
> = {
  draft: { th: 'ร่าง', en: 'Draft', color: 'default' },
  tor_review: { th: 'ทบทวน TOR', en: 'TOR Review', color: 'processing' },
  tender_open: { th: 'เปิดประมูล', en: 'Tender Open', color: 'processing' },
  evaluation: { th: 'พิจารณาผล', en: 'Evaluation', color: 'warning' },
  awarded: { th: 'ลงนามแล้ว', en: 'Awarded', color: 'success' },
  cancelled: { th: 'ยกเลิก', en: 'Cancelled', color: 'error' },
};

export const PROCUREMENT_METHOD_LABELS: Record<
  ProcurementMethod,
  { th: string; en: string }
> = {
  e_bidding: { th: 'ประกวดราคาอิเล็กทรอนิกส์', en: 'e-Bidding' },
  specific_method: { th: 'วิธีเฉพาะเจาะจง', en: 'Specific Method' },
  selection: { th: 'วิธีคัดเลือก', en: 'Selection' },
  reverse_auction: { th: 'ประมูลแบบลดราคา', en: 'Reverse Auction' },
};
