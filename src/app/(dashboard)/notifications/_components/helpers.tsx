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
// T2-PR2: bilingual + extracted to a sibling `.ts` module so the pure
// function is testable under vitest's node env. Re-exported here so
// existing import paths (`./helpers`) keep working.
export { formatRelativeTime } from './format-relative-time';

/* ---------- tab definitions ---------- */
export const TAB_ITEMS: { key: string; label: string; filter?: NotificationType }[] = [
  { key: 'all', label: 'ทั้งหมด' },
  { key: 'task', label: 'งานมอบหมาย', filter: 'task' },
  { key: 'milestone', label: 'Milestone', filter: 'milestone' },
  { key: 'approval', label: 'อนุมัติ', filter: 'approval' },
  { key: 'system', label: 'ระบบ', filter: 'system' },
];

export const PAGE_SIZE = 8;
