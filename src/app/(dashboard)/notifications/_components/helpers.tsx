import {
  BellOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
  MessageOutlined,
  SafetyCertificateOutlined,
  ToolOutlined,
  WarningOutlined,
} from '@ant-design/icons';

import { COLORS } from '@/theme/antd-theme';
import type { NotificationSeverity, NotificationType } from '@/types/notification';

/* ---------- severity → left border color ---------- */
export const SEVERITY_BORDER: Record<NotificationSeverity, string> = {
  error: COLORS.error,
  warning: COLORS.warning,
  success: COLORS.success,
  info: COLORS.info,
};

/* ---------- type → icon ---------- */
export function getTypeIcon(type: NotificationType) {
  switch (type) {
    case 'task':
      return <WarningOutlined style={{ color: COLORS.warning }} />;
    case 'milestone':
      return <ClockCircleOutlined style={{ color: COLORS.info }} />;
    case 'approval':
      return <CheckCircleOutlined style={{ color: COLORS.success }} />;
    case 'mention':
      return <MessageOutlined style={{ color: COLORS.info }} />;
    case 'quality':
      return <SafetyCertificateOutlined style={{ color: COLORS.error }} />;
    case 'risk':
      return <ExclamationCircleOutlined style={{ color: COLORS.warning }} />;
    case 'system':
      return <ToolOutlined style={{ color: COLORS.textMuted }} />;
    default:
      return <BellOutlined />;
  }
}

/* ---------- relative timestamp ---------- */
export function formatRelativeTime(isoDate: string): string {
  const now = new Date('2026-07-15T18:00:00'); // demo "now"
  const then = new Date(isoDate);
  const diffMs = now.getTime() - then.getTime();
  const diffMin = Math.floor(diffMs / 60_000);
  const diffHr = Math.floor(diffMs / 3_600_000);
  const diffDay = Math.floor(diffMs / 86_400_000);

  if (diffMin < 1) return 'เมื่อสักครู่';
  if (diffMin < 60) return `${diffMin} นาทีก่อน`;
  if (diffHr < 24) return `${diffHr} ชม.ก่อน`;
  if (diffDay === 1) return 'เมื่อวาน';
  if (diffDay < 7) return `${diffDay} วันก่อน`;
  return `${Math.floor(diffDay / 7)} สัปดาห์ก่อน`;
}

/* ---------- tab definitions ---------- */
export const TAB_ITEMS: { key: string; label: string; filter?: NotificationType }[] = [
  { key: 'all', label: 'ทั้งหมด' },
  { key: 'task', label: 'งานมอบหมาย', filter: 'task' },
  { key: 'milestone', label: 'Milestone', filter: 'milestone' },
  { key: 'approval', label: 'อนุมัติ', filter: 'approval' },
  { key: 'system', label: 'ระบบ', filter: 'system' },
];

export const PAGE_SIZE = 8;
