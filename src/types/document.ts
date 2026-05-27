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

export type CRStatus = 'approved' | 'pending' | 'rejected';
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
}

type StatusLabelEntry = { label: string; color: string };

export const DOC_STATUS_LABELS: Record<DocStatus, StatusLabelEntry> = {
  approved: { label: 'อนุมัติ (Approved)', color: 'green' },
  under_review: { label: 'รอตรวจ (Under Review)', color: 'gold' },
  draft: { label: 'ร่าง (Draft)', color: 'default' },
};

export const CR_STATUS_LABELS: Record<CRStatus, StatusLabelEntry> = {
  approved: { label: 'อนุมัติ (Approved)', color: 'green' },
  pending: { label: 'รออนุมัติ (Pending)', color: 'gold' },
  rejected: { label: 'ไม่อนุมัติ (Rejected)', color: 'red' },
};

export const CR_PRIORITY_LABELS: Record<CRPriority, StatusLabelEntry> = {
  high: { label: 'สูง (High)', color: 'red' },
  medium: { label: 'ปานกลาง (Medium)', color: 'gold' },
  low: { label: 'ต่ำ (Low)', color: 'green' },
};
