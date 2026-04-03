export type NotificationType = 'task' | 'milestone' | 'approval' | 'mention' | 'quality' | 'risk' | 'system';
export type NotificationSeverity = 'error' | 'warning' | 'success' | 'info';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  projectId: string | null;
  isRead: boolean;
  timestamp: string;
  actionUrl: string | null;
  severity: NotificationSeverity;
}

export const NOTIFICATION_TYPE_LABELS: Record<NotificationType, { th: string; en: string }> = {
  task: { th: 'งาน', en: 'Task' },
  milestone: { th: 'งวดงาน', en: 'Milestone' },
  approval: { th: 'อนุมัติ', en: 'Approval' },
  mention: { th: 'กล่าวถึง', en: 'Mention' },
  quality: { th: 'คุณภาพ', en: 'Quality' },
  risk: { th: 'ความเสี่ยง', en: 'Risk' },
  system: { th: 'ระบบ', en: 'System' },
};
