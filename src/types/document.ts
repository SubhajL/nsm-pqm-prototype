import type { UserRole } from '@/types/admin';

export interface Folder {
  id: string;
  name: string;
  parentId: string | null;
  fileCount?: number;
  pendingCount?: number;
}

export type DocStatus = 'approved' | 'under_review' | 'draft';

export type VirusScanStatus = 'pending' | 'clean' | 'infected';

/**
 * Per-document retention metadata. `retainUntil` is an ISO date; when
 * null the file is retained indefinitely (typical for contracts +
 * as-built drawings). `reason` cites the policy basis (e.g.
 * "OPDC-2569-04 §7: retain construction records 10 years").
 */
export interface DocumentRetentionPolicy {
  retainUntil: string | null;
  reason: string | null;
}

/**
 * Per-document RBAC overlay. Defaults to "everyone with project access
 * can do everything in AUTHZ_MATRIX" — set this object to narrow.
 * Roles are listed as UserRole strings so the matrix and the per-file
 * overlay use the same vocabulary.
 */
export interface DocumentAccessPolicy {
  read: UserRole[];
  write: UserRole[];
  approve: UserRole[];
}

export interface DocumentFile {
  id: string;
  folderId: string;
  name: string;
  type: string;
  version: number;
  size: string;
  uploadedBy: string;
  uploadedAt: string;
  status: DocStatus;
  workflow: string[];
  /**
   * SHA-256 hex digest of the file body at upload time. Used to detect
   * tampering and for de-duplication. Optional for seeded fixture data
   * that pre-dates PR-06; required for new uploads.
   */
  sha256?: string;
  /** Total size in bytes (the `size` field above is a human label like "15.2 MB"). */
  sizeBytes?: number;
  /** MIME type captured at upload time. */
  mimeType?: string;
  /** Virus-scan state. New uploads set `clean` immediately (stub scanner). */
  virusScanStatus?: VirusScanStatus;
  /** ISO timestamp of the most recent virus-scan decision, or null if unscanned. */
  virusScanCheckedAt?: string | null;
  /** Retention policy attached to this file. */
  retentionPolicy?: DocumentRetentionPolicy;
  /** Per-file RBAC overlay (defaults to project-wide AUTHZ_MATRIX behavior). */
  accessPolicy?: DocumentAccessPolicy;
}

export interface VersionEntry {
  version: number;
  date: string;
  author: string;
  note: string;
  /**
   * When true, this version is immutable — no new uploads under the
   * same fileId+versionId may overwrite it. Set automatically when the
   * version reaches status='approved'.
   */
  versionLocked?: boolean;
  /** SHA-256 hex digest of the file body for this version. */
  sha256?: string;
}

export interface PermissionEntry {
  role: string;
  upload: boolean;
  download: boolean;
  edit: boolean;
  delete: boolean;
  manageFolder: boolean;
}

export interface DocumentData {
  folders: Folder[];
  files: DocumentFile[];
  versionHistory: Record<string, VersionEntry[]>;
  permissions: PermissionEntry[];
}

/**
 * Change-request status union.
 *
 * Legacy values (`pending` / `approved`) are retained for back-compat with
 * pre-PR-27 fixture data and the existing change-request UI in
 * `src/app/(dashboard)/projects/[id]/change-request/`. PR-27 introduces
 * the granular workflow states (`submitted`, `under_review`,
 * `pm_approved`, `bureau_approved`, `committee_approved`, `applied`)
 * driven by the authority router in
 * `src/lib/rid/change-request-routing.ts`.
 *
 * State chart (PR-27):
 *   submitted → under_review → (pm_approved | bureau_approved | committee_approved) → applied
 *   * → rejected (allowed from any non-terminal state)
 *
 * Terminal states: `applied`, `rejected`. Legacy `approved` is treated as
 * equivalent to `applied`, and legacy `pending` is treated as equivalent
 * to `submitted` for status-filter purposes.
 */
export type CRStatus =
  | 'submitted'
  | 'under_review'
  | 'pm_approved'
  | 'bureau_approved'
  | 'committee_approved'
  | 'applied'
  | 'rejected'
  // Legacy values retained for fixture back-compat (see header comment).
  | 'pending'
  | 'approved';
export type CRPriority = 'high' | 'medium' | 'low';

export interface CRWorkflowStep {
  step: string;
  user: string;
  date: string | null;
  status: 'done' | 'current' | 'pending' | 'rejected';
}

export interface ChangeRequest {
  id: string;
  projectId: string;
  title: string;
  reason: string;
  budgetImpact: number;
  scheduleImpact: number;
  linkedWbs: string;
  priority: CRPriority;
  status: CRStatus;
  requestedBy: string;
  requestedAt: string;
  approvedBy: string | null;
  approvedAt: string | null;
  attachments: string[];
  workflow: CRWorkflowStep[];
  /**
   * PR-27 — Impact analysis. Delta to schedule expressed in days
   * (positive = delay, negative = pull-in). Defaults to 0 when the
   * impact has not yet been quantified.
   */
  impactScheduleDays: number;
  /**
   * PR-27 — Delta to project budget in THB. Positive = increase,
   * negative = scope-reduction / refund. Magnitude (absolute value) is
   * what the authority router uses to pick the required approval tier.
   */
  impactBudgetTHB: number;
  /**
   * PR-27 — Free-text description of the scope change ("เพิ่มจอ HMI 2
   * จอ", "เปลี่ยนแบบฐานราก"). Empty string means "no scope description
   * captured yet" (UI should surface as a warning).
   */
  impactScope: string;
  /**
   * PR-27 — Append-only chain of user ids who approved at each tier
   * (PM → bureau → committee). Length corresponds to how far the CR has
   * climbed the authority ladder. A rejected CR may have 0-N entries.
   */
  approvedByChain: string[];
  /**
   * PR-27 — Rationale captured when the CR was rejected. `null` while
   * the CR is still in flight or once it has been applied.
   */
  rejectedReason: string | null;
  /**
   * PR-27 — ISO 8601 timestamp of the final decision (applied OR
   * rejected). `null` while the CR is still in flight.
   */
  decidedAt: string | null;
}

type StatusLabelEntry = { label: string; color: string };

export const DOC_STATUS_LABELS: Record<DocStatus, StatusLabelEntry> = {
  approved: { label: 'อนุมัติ (Approved)', color: 'green' },
  under_review: { label: 'รอตรวจ (Under Review)', color: 'gold' },
  draft: { label: 'ร่าง (Draft)', color: 'default' },
};

export const CR_STATUS_LABELS: Record<CRStatus, StatusLabelEntry> = {
  // PR-27 granular states
  submitted: { label: 'ส่งคำขอแล้ว (Submitted)', color: 'default' },
  under_review: { label: 'อยู่ระหว่างพิจารณา (Under Review)', color: 'gold' },
  pm_approved: { label: 'หัวหน้าโครงการอนุมัติ (PM Approved)', color: 'cyan' },
  bureau_approved: { label: 'กองอนุมัติ (Bureau Approved)', color: 'blue' },
  committee_approved: { label: 'คณะกรรมการอนุมัติ (Committee Approved)', color: 'geekblue' },
  applied: { label: 'ดำเนินการแล้ว (Applied)', color: 'green' },
  rejected: { label: 'ไม่อนุมัติ (Rejected)', color: 'red' },
  // Legacy values (kept for back-compat with seed fixtures + existing UI).
  approved: { label: 'อนุมัติ (Approved)', color: 'green' },
  pending: { label: 'รออนุมัติ (Pending)', color: 'gold' },
};

export const CR_PRIORITY_LABELS: Record<CRPriority, StatusLabelEntry> = {
  high: { label: 'สูง (High)', color: 'red' },
  medium: { label: 'ปานกลาง (Medium)', color: 'gold' },
  low: { label: 'ต่ำ (Low)', color: 'green' },
};
