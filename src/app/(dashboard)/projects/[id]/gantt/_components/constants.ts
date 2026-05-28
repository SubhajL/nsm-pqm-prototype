import type dayjs from 'dayjs';

import { COLORS } from '@/theme/antd-theme';
import type { GanttLinkType } from '@/types/gantt';

/* ------------------------------------------------------------------ */
/* Constants                                                           */
/* ------------------------------------------------------------------ */

export const COLOR_COMPLETED = COLORS.success;        // #27AE60
export const COLOR_IN_PROGRESS = COLORS.info;         // #2D6BFF
export const COLOR_NOT_STARTED = COLORS.neutralGray;  // #d9d9d9
export const COLOR_MILESTONE = COLORS.warning;        // #F39C12
export const COLOR_TODAY = COLORS.error;              // #E74C3C
export const COLOR_BASELINE_BAR = COLORS.baselineBar; // #E8ECF1

export type ViewMode = 'baseline' | 'current' | 'compare';
export type TimeScale = 'day' | 'week' | 'month';

/** Pixels per time unit for each scale */
export const PX_PER_DAY = 28;
export const PX_PER_WEEK = 60;

/* ------------------------------------------------------------------ */
/* Row type for flat table                                             */
/* ------------------------------------------------------------------ */

export interface GanttRow {
  key: number;
  id: number;
  text: string;
  owner: string;
  progress: number;
  type: string;
  start_date: string;
  end_date: string;
  baseline_start_date?: string;
  baseline_end_date?: string;
  parent: number;
  level: number;
  children?: GanttRow[];
}

export interface GanttTaskFormValues {
  text: string;
  owner: string;
  start_date: string;
  end_date: string;
  progress: number;
  parent: number;
  type: string;
  predecessors: Array<{
    taskId?: number;
    linkType: GanttLinkType;
    lagDays: number;
  }>;
}

export const LINK_TYPE_OPTIONS: Array<{ label: string; value: GanttLinkType }> = [
  { label: 'FS (Finish-to-Start)', value: 'FS' },
  { label: 'SS (Start-to-Start)', value: 'SS' },
  { label: 'FF (Finish-to-Finish)', value: 'FF' },
  { label: 'SF (Start-to-Finish)', value: 'SF' },
];

export interface TimelineConfig {
  projectStart: dayjs.Dayjs;
  projectEnd: dayjs.Dayjs;
  totalDays: number;
  today: dayjs.Dayjs;
}
