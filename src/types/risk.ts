export type RiskLevel = 'critical' | 'high' | 'medium' | 'low';
export type RiskStatus = 'open' | 'mitigating' | 'closed' | 'accepted';

export interface Risk {
  id: string;
  projectId: string;
  title: string;
  description: string;
  likelihood: number;
  impact: number;
  score: number;
  level: RiskLevel;
  status: RiskStatus;
  owner: string;
  dateIdentified: string;
  mitigation: string;
}

export type IssueSeverity = 'high' | 'medium' | 'low';
export type IssueStatus = 'open' | 'in_progress' | 'review' | 'closed';

export interface Issue {
  id: string;
  projectId: string;
  title: string;
  severity: IssueSeverity;
  status: IssueStatus;
  assignee: string;
  linkedWbs: string;
  slaHours: number;
  resolution?: string;
  progress?: number;
  tags?: string[];
  sourceInspectionId?: string;
  sourceRiskId?: string;
  sourceType?: 'quality_auto_ncr' | 'risk_mitigation';
  createdAt: string;
  closedAt: string | null;
}

export const RISK_LEVEL_LABELS: Record<RiskLevel, { th: string; en: string; color: string }> = {
  critical: { th: 'วิกฤต', en: 'Critical', color: 'red' },
  high: { th: 'สูง', en: 'High', color: 'orange' },
  medium: { th: 'ปานกลาง', en: 'Medium', color: 'gold' },
  low: { th: 'ต่ำ', en: 'Low', color: 'green' },
};

export const RISK_STATUS_LABELS: Record<RiskStatus, { th: string; en: string; color: string }> = {
  open: { th: 'เปิด', en: 'Open', color: 'error' },
  mitigating: { th: 'กำลังจัดการ', en: 'Mitigating', color: 'warning' },
  closed: { th: 'ปิดแล้ว', en: 'Closed', color: 'success' },
  accepted: { th: 'ยอมรับ', en: 'Accepted', color: 'blue' },
};

export const ISSUE_SEVERITY_LABELS: Record<IssueSeverity, { th: string; en: string; color: string }> = {
  high: { th: 'สูง', en: 'High', color: 'red' },
  medium: { th: 'ปานกลาง', en: 'Medium', color: 'gold' },
  low: { th: 'ต่ำ', en: 'Low', color: 'green' },
};

export const ISSUE_STATUS_LABELS: Record<IssueStatus, { th: string; en: string; color: string }> = {
  open: { th: 'เปิด', en: 'Open', color: 'gold' },
  in_progress: { th: 'กำลังแก้ไข', en: 'In Progress', color: 'processing' },
  review: { th: 'รอตรวจสอบ', en: 'Review', color: 'cyan' },
  closed: { th: 'ปิดแล้ว', en: 'Closed', color: 'success' },
};
