export type DailyReportStatus = 'draft' | 'submitted' | 'approved' | 'rejected';

export interface DailyReportStatusHistoryEntry {
  id: string;
  status: DailyReportStatus;
  actorName: string;
  actorRole: string;
  timestamp: string;
  note?: string;
}

export interface PersonnelEntry {
  type: string;
  count: number;
}

export interface ActivityEntry {
  wbsId?: string;
  task: string;
  quantity: number;
  unit: string;
  cumulativeProgress: number;
}

export interface PhotoEntry {
  id: string;
  filename: string;
  gpsLat: number;
  gpsLng: number;
  timestamp: string;
  url?: string;
  mimeType?: string;
  sizeBytes?: number;
}

export interface AttachmentEntry {
  id: string;
  filename: string;
  url: string;
  mimeType: string;
  sizeBytes: number;
  uploadedAt: string;
}

export interface SignatureEntry {
  name: string;
  signed: boolean;
  timestamp: string | null;
}

export interface DailyReport {
  id: string;
  projectId: string;
  reportNumber: number;
  date: string;
  weather: string;
  temperature: number;
  linkedWbs: string[];
  personnel: PersonnelEntry[];
  totalPersonnel: number;
  activities: ActivityEntry[];
  photos: PhotoEntry[];
  attachments: AttachmentEntry[];
  issues: string;
  signatures: {
    reporter: SignatureEntry;
    inspector: SignatureEntry;
  };
  status: DailyReportStatus;
  statusHistory: DailyReportStatusHistoryEntry[];
}

export const DAILY_REPORT_STATUS_LABELS: Record<DailyReportStatus, { th: string; en: string; color: string }> = {
  draft: { th: 'ร่าง', en: 'Draft', color: 'default' },
  submitted: { th: 'ส่งแล้ว', en: 'Submitted', color: 'processing' },
  approved: { th: 'อนุมัติ', en: 'Approved', color: 'success' },
  rejected: { th: 'ไม่อนุมัติ', en: 'Rejected', color: 'error' },
};
