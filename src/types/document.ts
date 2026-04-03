export interface Folder {
  id: string;
  name: string;
  parentId: string | null;
  fileCount?: number;
  pendingCount?: number;
}

export type DocStatus = 'approved' | 'under_review' | 'draft';

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
}

export interface VersionEntry {
  version: number;
  date: string;
  author: string;
  note: string;
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
