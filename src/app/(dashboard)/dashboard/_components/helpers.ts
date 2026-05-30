import { PROJECT_STATUS_COLORS } from '@/theme/antd-theme';
import type { Project } from '@/types/project';

export type ProjectDisplayStatus = Project['status'] | 'on_schedule' | 'watch' | 'delayed';
export type DashboardStatusFilter = 'all' | 'in_progress' | 'planning' | 'completed';

import { PROJECT_CLASS_LABELS } from '@/types/project';

/**
 * Labels keyed by `ProjectClass` for dashboard donut-chart legends and
 * filter chips. Sourced from the canonical RID vocabulary so the dashboard
 * never drifts from the form / table labels.
 */
export const TYPE_LABEL_MAP: Record<string, string> = Object.fromEntries(
  Object.entries(PROJECT_CLASS_LABELS).map(([key, label]) => [
    key,
    `${label.th} (${label.en})`,
  ]),
);

export const STATUS_FILTER_OPTIONS: Array<{
  value: ProjectDisplayStatus;
  label: string;
}> = [
  { value: 'on_schedule', label: 'ตามแผน (On Schedule)' },
  { value: 'watch', label: 'เฝ้าระวัง (Watch)' },
  { value: 'delayed', label: 'ล่าช้า (Delayed)' },
  { value: 'planning', label: 'วางแผน (Planning)' },
  { value: 'completed', label: 'เสร็จสิ้น (Completed)' },
];

export const DASHBOARD_STATUS_LABELS: Record<
  ProjectDisplayStatus,
  { th: string; en: string; color: string }
> = {
  draft: { th: 'ร่าง', en: 'Draft', color: 'default' },
  planning: { th: 'วางแผน', en: 'Planning', color: PROJECT_STATUS_COLORS.planning },
  in_progress: { th: 'กำลังดำเนินการ', en: 'In Progress', color: PROJECT_STATUS_COLORS.inProgress },
  on_hold: { th: 'หยุดชั่วคราว', en: 'On Hold', color: 'warning' },
  completed: { th: 'เสร็จสิ้น', en: 'Completed', color: 'success' },
  cancelled: { th: 'ยกเลิก', en: 'Cancelled', color: 'error' },
  on_schedule: { th: 'ตามแผน', en: 'On Schedule', color: 'green' },
  watch: { th: 'เฝ้าระวัง', en: 'Watch', color: PROJECT_STATUS_COLORS.watch },
  delayed: { th: 'ล่าช้า', en: 'Delayed', color: PROJECT_STATUS_COLORS.delayed },
};

export function getProjectDisplayStatus(project: Project): ProjectDisplayStatus {
  if (project.status !== 'in_progress') {
    return project.status;
  }

  return project.scheduleHealth ?? 'on_schedule';
}
