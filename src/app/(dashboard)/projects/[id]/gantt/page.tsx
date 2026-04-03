'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Button,
  Card,
  Form,
  Input,
  InputNumber,
  message,
  Modal,
  Popconfirm,
  Radio,
  Select,
  Skeleton,
  Space,
  Table,
  Tag,
  Tooltip,
  Typography,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  DeleteOutlined,
  EditOutlined,
  FilePdfOutlined,
  PlusOutlined,
  SendOutlined,
} from '@ant-design/icons';
import Link from 'next/link';
import dayjs from 'dayjs';

import { useCreateGanttTask, useDeleteGanttTask, useGantt, useUpdateGanttTask } from '@/hooks/useGantt';
import type { GanttLinkType, GanttTask, GanttTaskInput } from '@/types/gantt';
import { useProject } from '@/hooks/useProjects';
import { useRouteProjectId } from '@/hooks/useRouteProjectId';
import { formatThaiDateShort } from '@/lib/date-utils';
import { canManageGantt } from '@/lib/auth';
import { useAuthStore } from '@/stores/useAuthStore';
import { COLORS } from '@/theme/antd-theme';
import { StatusBadge } from '@/components/common/StatusBadge';
import { buildGanttExportDocument } from '@/lib/export-documents';
import { openPrintableReport } from '@/lib/export-utils';
import {
  deriveTaskGroupScheduleHealth,
  deriveTaskScheduleHealth,
  getExecutableGanttTasks,
  getScheduleEvaluationDate,
} from '@/lib/project-progress-derivations';

const { Title, Text } = Typography;

/* ------------------------------------------------------------------ */
/* Constants                                                           */
/* ------------------------------------------------------------------ */

const COLOR_COMPLETED = COLORS.success;   // #27AE60
const COLOR_IN_PROGRESS = COLORS.info;    // #2D6BFF
const COLOR_NOT_STARTED = '#d9d9d9';
const COLOR_MILESTONE = COLORS.warning;   // #F39C12
const COLOR_TODAY = COLORS.error;         // #E74C3C
const COLOR_BASELINE_BAR = '#E8ECF1';

type ViewMode = 'baseline' | 'current' | 'compare';
type TimeScale = 'day' | 'week' | 'month';

/** Pixels per time unit for each scale */
const PX_PER_DAY = 28;
const PX_PER_WEEK = 60;

/** Calculate explicit timeline column width for day/week scales */
function getTimelineColumnWidth(timeScale: TimeScale, totalDays: number): number | undefined {
  switch (timeScale) {
    case 'day':
      return Math.max(600, totalDays * PX_PER_DAY);
    case 'week':
      return Math.max(600, Math.ceil(totalDays / 7) * PX_PER_WEEK);
    case 'month':
    default:
      return undefined; // natural flex
  }
}

/** Column widths: compact in day/week to maximise visible timeline */
function getColumnWidths(timeScale: TimeScale) {
  const compact = timeScale !== 'month';
  return {
    activity: compact ? 180 : 220,
    owner: compact ? 70 : 90,
    progress: compact ? 60 : 80,
    predecessors: compact ? 140 : 220,
    status: compact ? 180 : 260,
    actions: compact ? 100 : 140,
  };
}

/* ------------------------------------------------------------------ */
/* Row type for flat table                                             */
/* ------------------------------------------------------------------ */

interface GanttRow {
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

interface GanttTaskFormValues {
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

const LINK_TYPE_OPTIONS: Array<{ label: string; value: GanttLinkType }> = [
  { label: 'FS (Finish-to-Start)', value: 'FS' },
  { label: 'SS (Start-to-Start)', value: 'SS' },
  { label: 'FF (Finish-to-Finish)', value: 'FF' },
  { label: 'SF (Start-to-Finish)', value: 'SF' },
];

function formatDependencyLabel(sourceLabel: string, linkType: GanttLinkType, lagDays: number) {
  const lagLabel =
    lagDays === 0 ? '' : lagDays > 0 ? ` +${lagDays} วัน` : ` ${lagDays} วัน`;
  return `${sourceLabel} (${linkType}${lagLabel})`;
}

interface TimelineConfig {
  projectStart: dayjs.Dayjs;
  projectEnd: dayjs.Dayjs;
  totalDays: number;
  today: dayjs.Dayjs;
}

function parseFormDate(value: GanttTaskFormValues['start_date']) {
  if (typeof value === 'string') {
    const [day, month, year] = value.split('/');
    if (day && month && year) {
      return dayjs(`${year}-${month}-${day}`);
    }
    return dayjs(value);
  }

  return dayjs('');
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

function getBarMetrics(
  startDate: string,
  endDate: string,
  progress: number,
  timeline: TimelineConfig,
) {
  const start = dayjs(startDate);
  const end = dayjs(endDate);

  const offsetDays = start.diff(timeline.projectStart, 'day');
  const durationDays = Math.max(end.diff(start, 'day'), 1);

  const leftPct = Math.max(0, (offsetDays / timeline.totalDays) * 100);
  const widthPct = Math.min(
    (durationDays / timeline.totalDays) * 100,
    100 - leftPct,
  );
  const progressWidthPct = widthPct * progress;

  return { leftPct, widthPct, progressWidthPct };
}

function getTimelineOffsetPct(date: dayjs.Dayjs, timeline: TimelineConfig) {
  const rawPct = (date.diff(timeline.projectStart, 'day') / timeline.totalDays) * 100;
  return Math.min(100, Math.max(0, rawPct));
}

function getProgressColor(progress: number): string {
  if (progress >= 1) return COLOR_COMPLETED;
  if (progress > 0) return COLOR_IN_PROGRESS;
  return COLOR_NOT_STARTED;
}

function getStatusTag(progress: number, type: string) {
  if (type === 'milestone') {
    return <Tag color="gold">จุดสำคัญ (Milestone)</Tag>;
  }
  if (progress >= 1) {
    return <Tag color="success">เสร็จสิ้น (Complete)</Tag>;
  }
  if (progress > 0) {
    return <Tag color="processing">กำลังดำเนินการ (In Progress)</Tag>;
  }
  return <Tag color="default">ยังไม่เริ่ม (Not Started)</Tag>;
}

/** Build a nested tree structure from flat tasks */
function buildTree(tasks: GanttTask[]): GanttRow[] {
  const byParent = new Map<number, GanttTask[]>();

  for (const task of tasks) {
    const siblings = byParent.get(task.parent) ?? [];
    siblings.push(task);
    byParent.set(task.parent, siblings);
  }

  const buildRows = (parentId: number, level: number): GanttRow[] =>
    (byParent.get(parentId) ?? [])
      .sort((a, b) => dayjs(a.start_date).diff(dayjs(b.start_date)))
      .map((task) => {
        const children = buildRows(task.id, level + 1);
        return {
          key: task.id,
          id: task.id,
          text: task.text,
          owner: task.owner,
          progress: task.progress,
          type: task.type,
          start_date: task.start_date,
          end_date: task.end_date,
          baseline_start_date: task.baseline_start_date,
          baseline_end_date: task.baseline_end_date,
          parent: task.parent,
          level,
          children: children.length > 0 ? children : undefined,
        };
      });

  return buildRows(0, 0);
}

/** Generate month labels for the timeline header */
function getMonthLabels(timeline: TimelineConfig): { label: string; leftPct: number; widthPct: number }[] {
  const thaiMonths = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
  const months: { label: string; leftPct: number; widthPct: number }[] = [];
  let current = timeline.projectStart.startOf('month');
  const timelineEnd = timeline.projectEnd.endOf('month');

  while (current.isBefore(timelineEnd) || current.isSame(timelineEnd, 'month')) {
    const monthStart = current.isBefore(timeline.projectStart, 'day')
      ? timeline.projectStart
      : current;
    const rawMonthEnd = current.endOf('month');
    const monthEnd = rawMonthEnd.isAfter(timeline.projectEnd, 'day')
      ? timeline.projectEnd
      : rawMonthEnd;
    const offsetDays = monthStart.diff(timeline.projectStart, 'day');
    const durationDays = monthEnd.diff(monthStart, 'day') + 1;

    months.push({
      label: `${thaiMonths[current.month()]} ${String((current.year() + 543) % 100).padStart(2, '0')}`,
      leftPct: (offsetDays / timeline.totalDays) * 100,
      widthPct: (durationDays / timeline.totalDays) * 100,
    });
    current = current.add(1, 'month');
  }

  return months;
}

/** Generate week labels for the timeline header */
function getWeekLabels(timeline: TimelineConfig): { label: string; leftPct: number; widthPct: number }[] {
  const weeks: { label: string; leftPct: number; widthPct: number }[] = [];
  let current = timeline.projectStart.startOf('week');
  let weekNum = 1;

  while (current.isBefore(timeline.projectEnd) || current.isSame(timeline.projectEnd, 'day')) {
    const weekStart = current.isBefore(timeline.projectStart, 'day')
      ? timeline.projectStart
      : current;
    const rawWeekEnd = current.add(6, 'day');
    const weekEnd = rawWeekEnd.isAfter(timeline.projectEnd, 'day')
      ? timeline.projectEnd
      : rawWeekEnd;
    const offsetDays = weekStart.diff(timeline.projectStart, 'day');
    const durationDays = weekEnd.diff(weekStart, 'day') + 1;

    weeks.push({
      label: `W${weekNum}`,
      leftPct: (offsetDays / timeline.totalDays) * 100,
      widthPct: (durationDays / timeline.totalDays) * 100,
    });
    weekNum++;
    current = current.add(7, 'day');
  }

  return weeks;
}

/** Generate day labels for the timeline header */
function getDayLabels(timeline: TimelineConfig): { label: string; leftPct: number; widthPct: number }[] {
  const days: { label: string; leftPct: number; widthPct: number }[] = [];
  let current = timeline.projectStart;

  while (current.isBefore(timeline.projectEnd) || current.isSame(timeline.projectEnd, 'day')) {
    const offsetDays = current.diff(timeline.projectStart, 'day');
    days.push({
      label: `${current.date()}`,
      leftPct: (offsetDays / timeline.totalDays) * 100,
      widthPct: (1 / timeline.totalDays) * 100,
    });
    current = current.add(1, 'day');
  }

  return days;
}

/** Get timeline labels based on time scale */
function getTimelineLabels(timeline: TimelineConfig, timeScale: TimeScale) {
  switch (timeScale) {
    case 'day':
      return getDayLabels(timeline);
    case 'week':
      return getWeekLabels(timeline);
    case 'month':
    default:
      return getMonthLabels(timeline);
  }
}

function buildTimelineConfig(
  projectStartDate: string | undefined,
  projectEndDate: string | undefined,
  tasks: GanttTask[],
): TimelineConfig {
  const taskStarts = tasks.map((task) => dayjs(task.start_date)).filter((date) => date.isValid());
  const taskEnds = tasks.map((task) => dayjs(task.end_date)).filter((date) => date.isValid());
  const fallbackStart = dayjs(projectStartDate);
  const fallbackEnd = dayjs(projectEndDate);
  const defaultStart = taskStarts[0] ?? getScheduleEvaluationDate().startOf('month');
  const defaultEnd = taskEnds[0] ?? defaultStart.add(30, 'day');

  const projectStart = fallbackStart.isValid()
    ? fallbackStart
    : taskStarts.reduce((min, date) => (date.isBefore(min, 'day') ? date : min), defaultStart);
  const projectEnd = fallbackEnd.isValid()
    ? fallbackEnd
    : taskEnds.reduce((max, date) => (date.isAfter(max, 'day') ? date : max), defaultEnd);
  const today = getScheduleEvaluationDate();
  const normalizedEnd = projectEnd.isAfter(projectStart, 'day')
    ? projectEnd
    : projectStart.add(30, 'day');

  return {
    projectStart,
    projectEnd: normalizedEnd,
    totalDays: Math.max(normalizedEnd.diff(projectStart, 'day') + 1, 1),
    today,
  };
}

/* ------------------------------------------------------------------ */
/* Timeline Bar Component                                              */
/* ------------------------------------------------------------------ */

function TimelineBar({
  startDate,
  endDate,
  progress,
  type,
  isParent,
  timeline,
  viewMode,
  baselineStartDate,
  baselineEndDate,
}: {
  startDate: string;
  endDate: string;
  progress: number;
  type: string;
  isParent: boolean;
  timeline: TimelineConfig;
  viewMode: ViewMode;
  baselineStartDate?: string;
  baselineEndDate?: string;
}) {
  const todayOffsetPct = getTimelineOffsetPct(timeline.today, timeline);
  const bStart = baselineStartDate ?? startDate;
  const bEnd = baselineEndDate ?? endDate;

  // Milestone: render diamond marker(s)
  if (type === 'milestone') {
    const currentOffsetDays = dayjs(startDate).diff(timeline.projectStart, 'day');
    const currentLeftPct = Math.min(100, Math.max(0, (currentOffsetDays / timeline.totalDays) * 100));
    const baselineOffsetDays = dayjs(bStart).diff(timeline.projectStart, 'day');
    const baselineLeftPct = Math.min(100, Math.max(0, (baselineOffsetDays / timeline.totalDays) * 100));

    const showBaseline = viewMode === 'baseline' || viewMode === 'compare';
    const showCurrent = viewMode === 'current' || viewMode === 'compare';

    return (
      <div style={{ position: 'relative', width: '100%', height: 28 }}>
        <div
          style={{
            position: 'absolute', left: `${todayOffsetPct}%`, top: 0, bottom: 0,
            width: 0, borderLeft: `2px dashed ${COLOR_TODAY}`, zIndex: 2,
          }}
        />
        {showBaseline && (
          <Tooltip title={`Baseline: ${formatThaiDateShort(bStart)}`}>
            <div
              data-testid="baseline-milestone"
              style={{
                position: 'absolute',
                left: `calc(${baselineLeftPct}% - 7px)`,
                top: viewMode === 'compare' ? 2 : 7,
                width: 12, height: 12,
                backgroundColor: COLOR_BASELINE_BAR, border: '2px solid #bfbfbf',
                transform: 'rotate(45deg)', zIndex: 1,
              }}
            />
          </Tooltip>
        )}
        {showCurrent && (
          <Tooltip title={`${formatThaiDateShort(startDate)}`}>
            <div
              style={{
                position: 'absolute',
                left: `calc(${currentLeftPct}% - 7px)`,
                top: viewMode === 'compare' ? 14 : 7,
                width: 14, height: 14,
                backgroundColor: COLOR_MILESTONE,
                transform: 'rotate(45deg)', zIndex: 1,
              }}
            />
          </Tooltip>
        )}
      </div>
    );
  }

  const barRadius = isParent ? 2 : 4;

  // Baseline bar metrics
  const baselineMetrics = getBarMetrics(bStart, bEnd, 0, timeline);
  // Current bar metrics
  const currentMetrics = getBarMetrics(startDate, endDate, progress, timeline);
  const barColor = getProgressColor(progress);

  const showBaseline = viewMode === 'baseline' || viewMode === 'compare';
  const showCurrent = viewMode === 'current' || viewMode === 'compare';

  // Layout heights depending on view mode
  const totalHeight = viewMode === 'compare' ? 36 : 28;
  const baselineBarHeight = viewMode === 'compare' ? (isParent ? 8 : 10) : (isParent ? 10 : 18);
  const currentBarHeight = viewMode === 'compare' ? (isParent ? 8 : 14) : (isParent ? 10 : 18);
  const baselineTop = viewMode === 'compare' ? 2 : (isParent ? 9 : 5);
  const currentTop = viewMode === 'compare' ? (baselineTop + baselineBarHeight + 2) : (isParent ? 9 : 5);

  return (
    <div style={{ position: 'relative', width: '100%', height: totalHeight }}>
      {/* Today marker */}
      <div
        style={{
          position: 'absolute', left: `${todayOffsetPct}%`, top: 0, bottom: 0,
          width: 0, borderLeft: `2px dashed ${COLOR_TODAY}`, zIndex: 2,
        }}
      />

      {/* Baseline bar */}
      {showBaseline && (
        <Tooltip
          title={`Baseline: ${formatThaiDateShort(bStart)} - ${formatThaiDateShort(bEnd)}`}
        >
          <div
            data-testid="baseline-bar"
            style={{
              position: 'absolute',
              left: `${baselineMetrics.leftPct}%`,
              top: baselineTop,
              width: `${baselineMetrics.widthPct}%`,
              height: baselineBarHeight,
              backgroundColor: COLOR_BASELINE_BAR,
              borderRadius: barRadius,
              border: viewMode === 'compare' ? '1px dashed #bfbfbf' : undefined,
            }}
          />
        </Tooltip>
      )}

      {/* Current bar with progress fill */}
      {showCurrent && (
        <Tooltip
          title={`${formatThaiDateShort(startDate)} - ${formatThaiDateShort(endDate)} | ${Math.round(progress * 100)}%`}
        >
          <div
            style={{
              position: 'absolute',
              left: `${currentMetrics.leftPct}%`,
              top: currentTop,
              width: `${currentMetrics.widthPct}%`,
              height: currentBarHeight,
              backgroundColor: COLOR_BASELINE_BAR,
              borderRadius: barRadius,
              overflow: 'hidden',
            }}
          >
            {currentMetrics.progressWidthPct > 0 && (
              <div
                style={{
                  width: `${(progress * 100)}%`,
                  height: '100%',
                  backgroundColor: barColor,
                  borderRadius: barRadius,
                  transition: 'width 0.3s ease',
                }}
              />
            )}
          </div>
        </Tooltip>
      )}

      {/* Parent bracket ends */}
      {isParent && showCurrent && (
        <>
          <div
            style={{
              position: 'absolute',
              left: `${currentMetrics.leftPct}%`,
              top: currentTop + currentBarHeight - 1,
              width: 6, height: 6,
              backgroundColor: '#8c8c8c',
              clipPath: 'polygon(0 0, 100% 0, 50% 100%)',
            }}
          />
          <div
            style={{
              position: 'absolute',
              left: `calc(${currentMetrics.leftPct + currentMetrics.widthPct}% - 6px)`,
              top: currentTop + currentBarHeight - 1,
              width: 6, height: 6,
              backgroundColor: '#8c8c8c',
              clipPath: 'polygon(0 0, 100% 0, 50% 100%)',
            }}
          />
        </>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Timeline Header                                                     */
/* ------------------------------------------------------------------ */

function TimelineHeader({ timeline, timeScale }: { timeline: TimelineConfig; timeScale: TimeScale }) {
  const labels = getTimelineLabels(timeline, timeScale);
  const todayOffsetPct = getTimelineOffsetPct(timeline.today, timeline);
  const fontSize = timeScale === 'day' ? 10 : 12;

  // For day scale, show month labels on top row + day numbers on bottom row
  const showMonthRow = timeScale === 'day';
  const monthLabels = showMonthRow ? getMonthLabels(timeline) : [];
  const totalHeight = showMonthRow ? 50 : 32;
  const monthRowHeight = 18;
  const dayRowTop = showMonthRow ? monthRowHeight : 0;
  const dayRowHeight = showMonthRow ? totalHeight - monthRowHeight : totalHeight;

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: totalHeight,
        borderBottom: `1px solid ${COLORS.borderLight}`,
      }}
    >
      {/* Month row (only for day scale) */}
      {showMonthRow &&
        monthLabels.map((m) => (
          <div
            key={`month-${m.label}`}
            style={{
              position: 'absolute',
              left: `${m.leftPct}%`,
              width: `${m.widthPct}%`,
              top: 0,
              height: monthRowHeight,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRight: `1px solid ${COLORS.borderLight}`,
              borderBottom: `1px solid ${COLORS.borderLight}`,
              fontSize: 11,
              color: COLORS.textDark,
              fontWeight: 600,
              backgroundColor: '#f8f9fb',
              overflow: 'hidden',
              whiteSpace: 'nowrap',
            }}
          >
            {m.label}
          </div>
        ))}

      {/* Day/Week/Month labels */}
      {labels.map((m, idx) => (
        <div
          key={`${m.label}-${idx}`}
          style={{
            position: 'absolute',
            left: `${m.leftPct}%`,
            width: `${m.widthPct}%`,
            top: dayRowTop,
            height: dayRowHeight,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRight: `1px solid ${COLORS.borderLight}`,
            fontSize,
            color: COLORS.textDark,
            fontWeight: 500,
            overflow: 'hidden',
            whiteSpace: 'nowrap',
          }}
        >
          {m.label}
        </div>
      ))}

      {/* Today marker in header */}
      <div
        style={{
          position: 'absolute',
          left: `${todayOffsetPct}%`,
          top: 0,
          bottom: 0,
          width: 0,
          borderLeft: `2px dashed ${COLOR_TODAY}`,
          zIndex: 2,
        }}
      />
      <Tooltip title={`วันนี้ (Today): ${formatThaiDateShort(timeline.today.format('YYYY-MM-DD'))}`}>
        <div
          style={{
            position: 'absolute',
            left: `calc(${todayOffsetPct}% - 10px)`,
            top: -2,
            width: 20,
            height: 14,
            backgroundColor: COLOR_TODAY,
            borderRadius: '3px 3px 0 0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 3,
          }}
        >
          <span style={{ color: '#fff', fontSize: 8, fontWeight: 700 }}>
            {timeline.today.date()}
          </span>
        </div>
      </Tooltip>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Legend                                                               */
/* ------------------------------------------------------------------ */

function GanttLegend() {
  const items: { color: string; label: string; type: 'square' | 'diamond' | 'line' }[] = [
    { color: COLOR_BASELINE_BAR, label: 'แผนงาน (Baseline)', type: 'square' },
    { color: COLOR_IN_PROGRESS, label: 'ความคืบหน้าจริง (Actual)', type: 'square' },
    { color: COLOR_COMPLETED, label: 'เสร็จสิ้น (Complete)', type: 'square' },
    { color: COLOR_MILESTONE, label: 'จุดสำคัญ (Milestone)', type: 'diamond' },
    { color: COLOR_TODAY, label: 'วันนี้ (Today)', type: 'line' },
  ];

  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: 24,
        padding: '12px 0 0',
      }}
    >
      {items.map((item) => (
        <div
          key={item.label}
          style={{ display: 'flex', alignItems: 'center', gap: 6 }}
        >
          {item.type === 'square' && (
            <div
              style={{
                width: 14,
                height: 14,
                backgroundColor: item.color,
                borderRadius: 2,
              }}
            />
          )}
          {item.type === 'diamond' && (
            <div
              style={{
                width: 12,
                height: 12,
                backgroundColor: item.color,
                transform: 'rotate(45deg)',
              }}
            />
          )}
          {item.type === 'line' && (
            <div
              style={{
                width: 20,
                height: 0,
                borderTop: `2px dashed ${item.color}`,
              }}
            />
          )}
          <Text style={{ fontSize: 13, color: COLORS.textDark }}>
            {item.label}
          </Text>
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Main Page Component                                                 */
/* ------------------------------------------------------------------ */

export default function GanttChartPage() {
  const projectId = useRouteProjectId() ?? 'proj-001';
  const [form] = Form.useForm<GanttTaskFormValues>();
  const { data: project } = useProject(projectId);
  const { data: ganttData, isLoading } = useGantt(projectId);
  const createTask = useCreateGanttTask(projectId);
  const updateTask = useUpdateGanttTask(projectId);
  const deleteTask = useDeleteGanttTask(projectId);
  const currentUser = useAuthStore((s) => s.currentUser);
  const [viewMode, setViewMode] = useState<ViewMode>('current');
  const [timeScale, setTimeScale] = useState<TimeScale>('month');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<GanttTask | null>(null);
  const canEditGantt = canManageGantt(currentUser?.role);

  const treeData = useMemo(() => {
    if (!ganttData?.data) return [];
    return buildTree(ganttData.data);
  }, [ganttData]);
  const timeline = useMemo(
    () => buildTimelineConfig(project?.startDate, project?.endDate, ganttData?.data ?? []),
    [ganttData?.data, project?.endDate, project?.startDate],
  );
  const taskScheduleHealthById = useMemo(() => {
    const rows = ganttData?.data ?? [];
    return new Map(
      rows
        .filter((task) => task.type === 'task')
        .map((task) => [task.id, deriveTaskScheduleHealth(task, timeline.today)]),
    );
  }, [ganttData?.data, timeline.today]);
  const projectScheduleHealthByParentId = useMemo(() => {
    const rows = ganttData?.data ?? [];
    const executableTasks = getExecutableGanttTasks(rows);
    const descendants = new Map<number, GanttTask[]>();

    rows.forEach((task) => {
      if (task.type !== 'task') {
        return;
      }

      let currentParent = task.parent;
      while (currentParent !== 0) {
        const group = descendants.get(currentParent) ?? [];
        group.push(task);
        descendants.set(currentParent, group);
        currentParent = rows.find((candidate) => candidate.id === currentParent)?.parent ?? 0;
      }
    });

    return new Map(
      rows
        .filter((task) => task.type === 'project')
        .map((task) => [
          task.id,
          deriveTaskGroupScheduleHealth(
            descendants.get(task.id) ?? executableTasks.filter((entry) => entry.parent === task.id),
            timeline.today,
          ),
        ]),
    );
  }, [ganttData?.data, timeline.today]);

  const taskOptions = useMemo(
    () =>
      (ganttData?.data ?? []).map((task) => ({
        label: task.text,
        value: task.id,
      })),
    [ganttData],
  );
  const predecessorLabelsByTargetId = useMemo(() => {
    const labelsById = new Map((ganttData?.data ?? []).map((task) => [task.id, task.text]));
    const map = new Map<number, string[]>();

    (ganttData?.links ?? []).forEach((link) => {
      const sourceLabel = labelsById.get(link.source);
      if (!sourceLabel) {
        return;
      }

      const entries = map.get(link.target) ?? [];
      entries.push(formatDependencyLabel(sourceLabel, link.type, link.lagDays ?? 0));
      map.set(link.target, entries);
    });

    return map;
  }, [ganttData?.data, ganttData?.links]);

  useEffect(() => {
    if (!modalOpen) {
      form.resetFields();
      return;
    }

    if (editingTask) {
      form.setFieldsValue({
        text: editingTask.text,
        owner: editingTask.owner,
        start_date: dayjs(editingTask.start_date).format('DD/MM/YYYY'),
        end_date: dayjs(editingTask.end_date).format('DD/MM/YYYY'),
        progress: Math.round(editingTask.progress * 100),
        parent: editingTask.parent,
        type: editingTask.type,
        predecessors: (ganttData?.links ?? [])
          .filter((link) => link.target === editingTask.id)
          .map((link) => ({
            taskId: link.source,
            linkType: link.type,
            lagDays: link.lagDays ?? 0,
          })),
      });
      return;
    }

    form.setFieldsValue({
      text: '',
      owner: currentUser?.name ?? '',
      start_date: project?.startDate
        ? dayjs(project.startDate).format('DD/MM/YYYY')
        : dayjs().format('DD/MM/YYYY'),
      end_date: project?.startDate
        ? dayjs(project.startDate).add(7, 'day').format('DD/MM/YYYY')
        : dayjs().add(7, 'day').format('DD/MM/YYYY'),
      progress: 0,
      parent: 0,
      type: 'task',
      predecessors: [],
    });
  }, [currentUser?.name, editingTask, form, ganttData?.links, modalOpen, project?.startDate]);

  const openCreateModal = () => {
    setEditingTask(null);
    setModalOpen(true);
  };

  const openEditModal = (task: GanttTask) => {
    setEditingTask(task);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingTask(null);
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      const startDate = parseFormDate(values.start_date);
      const endDate = parseFormDate(values.end_date);

      if (!startDate.isValid() || !endDate.isValid()) {
        message.error('กรุณาระบุวันที่เริ่มต้นและวันที่สิ้นสุดให้ถูกต้อง');
        return;
      }

      const payload: GanttTaskInput = {
        text: values.text.trim(),
        owner: values.owner.trim(),
        start_date: startDate.format('YYYY-MM-DD'),
        end_date: endDate.format('YYYY-MM-DD'),
        progress: values.progress,
        parent: values.parent ?? 0,
        type: values.type,
        predecessors: (values.predecessors ?? [])
          .filter(
            (
              entry,
            ): entry is { taskId: number; linkType: GanttLinkType; lagDays: number } =>
              Number.isInteger(entry?.taskId) && Number(entry.taskId) > 0,
          )
          .map((entry) => ({
            taskId: Number(entry.taskId),
            linkType: entry.linkType,
            lagDays: Number(entry.lagDays) || 0,
          })),
      };

      if (editingTask) {
        await updateTask.mutateAsync({ id: editingTask.id, ...payload });
        message.success('อัปเดตแผนงานแล้ว');
      } else {
        await createTask.mutateAsync(payload);
        message.success('เพิ่มงานในแผน Gantt แล้ว');
      }

      closeModal();
    } catch (error) {
      if (error instanceof Error && error.name === 'ApiError') {
        message.error(error.message);
      } else if (error instanceof Error) {
        message.error(error.message);
      }
    }
  };

  const handleExportPdf = () => {
    const opened = openPrintableReport(
      buildGanttExportDocument({
        project,
        ganttData,
        viewMode,
        timeScale,
      }),
    );
    if (!opened) {
      message.error('ไม่สามารถเปิดหน้าต่างรายงานได้ กรุณาอนุญาต pop-up');
    }
  };

  const timelineColumnWidth = getTimelineColumnWidth(timeScale, timeline.totalDays);
  const colW = getColumnWidths(timeScale);

  // Calculate total scroll width: sum of left columns + timeline
  const leftColumnsTotal = colW.activity + colW.owner + colW.progress + colW.predecessors + colW.status;
  const scrollX = timelineColumnWidth
    ? leftColumnsTotal + timelineColumnWidth + (canEditGantt ? colW.actions : 0)
    : 1100;

  const columns: ColumnsType<GanttRow> = (() => {
      const baseColumns: ColumnsType<GanttRow> = [
      {
        title: 'กิจกรรม (Activity)',
        dataIndex: 'text',
        key: 'text',
        width: colW.activity,
        fixed: 'left' as const,
        render: (text: string, record: GanttRow) => {
          const isParent = record.level === 0;
          const isMilestone = record.type === 'milestone';
          const predecessors = predecessorLabelsByTargetId.get(record.id) ?? [];
          return (
            <div>
              <span
                style={{
                  fontWeight: isParent ? 600 : 400,
                  color: isMilestone ? COLOR_MILESTONE : COLORS.textDark,
                }}
              >
                {isMilestone && (
                  <span style={{ marginRight: 4, color: COLOR_MILESTONE }}>
                    ◆
                  </span>
                )}
                {text}
              </span>
              {predecessors.length > 0 ? (
                <div style={{ marginTop: 4 }}>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    ขึ้นกับ: {predecessors.join(', ')}
                  </Text>
                </div>
              ) : null}
            </div>
          );
        },
      },
      {
        title: 'ผู้รับผิดชอบ',
        dataIndex: 'owner',
        key: 'owner',
        width: colW.owner,
        render: (owner: string) => owner || '—',
      },
      {
        title: '% สำเร็จ',
        dataIndex: 'progress',
        key: 'progress',
        width: colW.progress,
        align: 'center' as const,
        render: (progress: number, record: GanttRow) => {
          if (record.type === 'milestone') return '—';
          const pct = Math.round(progress * 100);
          return (
            <span
              style={{
                fontWeight: 600,
                color: getProgressColor(progress),
              }}
            >
              {pct}%
            </span>
          );
        },
      },
      {
        title: 'งานก่อนหน้า',
        key: 'predecessors',
        width: colW.predecessors,
        render: (_: unknown, record: GanttRow) => {
          const predecessors = predecessorLabelsByTargetId.get(record.id) ?? [];

          if (predecessors.length === 0) {
            return '—';
          }

          return (
            <Space wrap size={4}>
              {predecessors.map((label) => (
                <Tag key={`${record.id}-${label}`} color="purple">
                  {label}
                </Tag>
              ))}
            </Space>
          );
        },
      },
      {
        title: 'สถานะ (Status)',
        key: 'status',
        width: colW.status,
        render: (_: unknown, record: GanttRow) => {
          if (record.type === 'milestone') {
            return getStatusTag(record.progress, record.type);
          }

          const scheduleHealth =
            record.type === 'task'
              ? taskScheduleHealthById.get(record.id)
              : projectScheduleHealthByParentId.get(record.id);
          const showScheduleHealth =
            Boolean(scheduleHealth) &&
            scheduleHealth !== 'not_started' &&
            !(record.type === 'task' && record.progress >= 1);
          const scheduleBadgeStatus = showScheduleHealth ? scheduleHealth ?? null : null;

          return (
            <Space wrap size={4}>
              {getStatusTag(record.progress, record.type)}
              {scheduleBadgeStatus ? (
                <StatusBadge status={scheduleBadgeStatus} type="project" />
              ) : null}
            </Space>
          );
        },
      },
      {
        title: (
          <div>
            <div style={{ marginBottom: 4, fontWeight: 600 }}>
              แผนงาน (Timeline)
            </div>
            <TimelineHeader timeline={timeline} timeScale={timeScale} />
          </div>
        ),
        key: 'timeline',
        width: timelineColumnWidth,
        render: (_: unknown, record: GanttRow) => (
          <TimelineBar
            startDate={record.start_date}
            endDate={record.end_date}
            progress={record.progress}
            type={record.type}
            isParent={record.level === 0}
            timeline={timeline}
            viewMode={viewMode}
            baselineStartDate={record.baseline_start_date}
            baselineEndDate={record.baseline_end_date}
          />
        ),
      },
      ];

      if (canEditGantt) {
        baseColumns.push({
          title: 'จัดการ',
          key: 'actions',
          width: colW.actions,
          align: 'center',
          render: (_value, record) => (
            <Space size="small">
              <Button
                size="small"
                icon={<EditOutlined />}
                aria-label={`แก้ไข ${record.text}`}
                onClick={() =>
                  openEditModal({
                    id: record.id,
                    text: record.text,
                    owner: record.owner,
                    start_date: record.start_date,
                    end_date: record.end_date,
                    progress: record.progress,
                    parent: record.parent,
                    type: record.type,
                    duration: Math.max(
                      dayjs(record.end_date).diff(dayjs(record.start_date), 'day') + 1,
                      1,
                    ),
                  })
                }
              />
              <Popconfirm
                title="ลบงานในแผน Gantt"
                description={`ต้องการลบ "${record.text}" ใช่หรือไม่`}
                okText="ลบ"
                cancelText="ยกเลิก"
                onConfirm={async () => {
                  try {
                    await deleteTask.mutateAsync({ id: record.id });
                    message.success('ลบงานในแผน Gantt แล้ว');
                  } catch (error) {
                    message.error(error instanceof Error ? error.message : 'ไม่สามารถลบงานในแผน Gantt ได้');
                  }
                }}
              >
                <Button
                  danger
                  size="small"
                  icon={<DeleteOutlined />}
                  aria-label={`ลบ ${record.text}`}
                />
              </Popconfirm>
            </Space>
          ),
        });
      }

      return baseColumns;
    })();

  /* ----- Loading state ----- */
  if (isLoading) {
    return (
      <div>
        <Title level={3}>แผนภูมิแกนต์ (Gantt Chart)</Title>
        <Card style={{ marginTop: 16 }}>
          <Skeleton active paragraph={{ rows: 12 }} />
        </Card>
      </div>
    );
  }

  return (
    <div>
      {/* ---------- Page Header ---------- */}
      <div style={{ marginBottom: 20 }}>
        <Title level={3} style={{ marginBottom: 4 }}>
          แผนภูมิแกนต์ (Gantt Chart)
        </Title>
        <Text type="secondary" style={{ fontSize: 14 }}>
          {project?.name ?? 'รายละเอียดโครงการ'}
        </Text>
      </div>

      {/* ---------- Toolbar ---------- */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 12,
          marginBottom: 16,
        }}
      >
        <Space wrap size="middle">
          <Radio.Group
            value={viewMode}
            onChange={(e) => setViewMode(e.target.value)}
            optionType="button"
            buttonStyle="solid"
            options={[
              { label: 'Baseline', value: 'baseline' },
              { label: 'ปัจจุบัน', value: 'current' },
              { label: 'เปรียบเทียบ', value: 'compare' },
            ]}
          />
          <Radio.Group
            value={timeScale}
            onChange={(e) => setTimeScale(e.target.value)}
            optionType="button"
            buttonStyle="solid"
            options={[
              { label: 'วัน', value: 'day' },
              { label: 'สัปดาห์', value: 'week' },
              { label: 'เดือน', value: 'month' },
            ]}
          />
        </Space>

        <Space>
          {canEditGantt ? (
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={openCreateModal}
            >
              เพิ่มงาน
            </Button>
          ) : null}
          <Link href={`/projects/${projectId}/approval`}>
            <Button
              type="primary"
              icon={<SendOutlined />}
              style={{
                backgroundColor: COLORS.accentTeal,
                borderColor: COLORS.accentTeal,
              }}
            >
              ขออนุมัติแผนงาน
            </Button>
          </Link>
          <Button icon={<FilePdfOutlined />} onClick={handleExportPdf}>Export PDF</Button>
        </Space>
      </div>

      {/* ---------- Gantt Table ---------- */}
      <Card
        styles={{
          body: { padding: '0 0 16px 0' },
        }}
        style={{
          boxShadow: '0 2px 10px rgba(0,0,0,0.08)',
        }}
      >
        <Table<GanttRow>
          columns={columns}
          dataSource={treeData}
          rowKey="key"
          pagination={false}
          size="middle"
          scroll={{ x: scrollX }}
          expandable={{
            defaultExpandAllRows: true,
            expandRowByClick: true,
          }}
          rowClassName={(record) =>
            record.level === 0 ? 'gantt-parent-row' : ''
          }
        />

        {/* ---------- Legend ---------- */}
        <div style={{ padding: '0 24px' }}>
          <GanttLegend />
        </div>
      </Card>

      {/* ---------- Inline styles for parent row highlight ---------- */}
      <style jsx global>{`
        .gantt-parent-row td {
          background-color: #f8f9fb !important;
        }
        .gantt-parent-row:hover td {
          background-color: #f0f2f5 !important;
        }
      `}</style>

      <Modal
        title={editingTask ? 'แก้ไขงานในแผน Gantt' : 'เพิ่มงานในแผน Gantt'}
        open={modalOpen}
        onCancel={closeModal}
        onOk={() => void handleSubmit()}
        okText="บันทึก"
        cancelText="ยกเลิก"
        confirmLoading={createTask.isPending || updateTask.isPending}
        destroyOnClose
      >
        <Form<GanttTaskFormValues> form={form} layout="vertical">
          <Form.Item
            label="ชื่อกิจกรรม"
            name="text"
            rules={[{ required: true, message: 'กรุณาระบุชื่อกิจกรรม' }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            label="ผู้รับผิดชอบ"
            name="owner"
            rules={[{ required: true, message: 'กรุณาระบุผู้รับผิดชอบ' }]}
          >
            <Input />
          </Form.Item>
          <Form.Item label="ประเภทกิจกรรม" name="type">
            <Select
              options={[
                { label: 'งานหลัก (Project Phase)', value: 'project' },
                { label: 'งานย่อย (Task)', value: 'task' },
                { label: 'Milestone', value: 'milestone' },
              ]}
            />
          </Form.Item>
          <Form.Item label="งานแม่" name="parent">
            <Select
              options={[{ label: 'ระดับบนสุด', value: 0 }, ...taskOptions]}
            />
          </Form.Item>
          <Form.List name="predecessors">
            {(fields, { add, remove }) => (
              <Space direction="vertical" size={12} style={{ width: '100%' }}>
                {fields.map((field, index) => (
                  <Space
                    key={field.key}
                    align="start"
                    style={{ display: 'flex', width: '100%' }}
                    size="middle"
                  >
                    <Form.Item
                      {...field}
                      label={index === 0 ? 'งานก่อนหน้า' : undefined}
                      name={[field.name, 'taskId']}
                      rules={[{ required: true, message: 'กรุณาเลือกงานก่อนหน้า' }]}
                      style={{ flex: 1 }}
                    >
                      <Select
                        aria-label={`งานก่อนหน้า ${index + 1}`}
                        options={(ganttData?.data ?? [])
                          .filter((task) => task.id !== editingTask?.id && task.type !== 'project')
                          .map((task) => ({ label: task.text, value: task.id }))}
                        placeholder="เลือกงานที่เกี่ยวข้อง"
                      />
                    </Form.Item>
                    <Form.Item
                      {...field}
                      label={index === 0 ? 'ประเภทความสัมพันธ์' : undefined}
                      name={[field.name, 'linkType']}
                      initialValue="FS"
                      style={{ width: 220 }}
                    >
                      <Select
                        aria-label={`ประเภทความสัมพันธ์ ${index + 1}`}
                        options={LINK_TYPE_OPTIONS}
                      />
                    </Form.Item>
                    <Form.Item
                      {...field}
                      label={index === 0 ? 'Lag (วัน)' : undefined}
                      name={[field.name, 'lagDays']}
                      initialValue={0}
                      style={{ width: 140 }}
                    >
                      <InputNumber aria-label={`Lag ${index + 1}`} style={{ width: '100%' }} />
                    </Form.Item>
                    <Button
                      aria-label={`ลบงานก่อนหน้า ${index + 1}`}
                      icon={<DeleteOutlined />}
                      onClick={() => remove(field.name)}
                    />
                  </Space>
                ))}
                <Button
                  onClick={() => add({ taskId: undefined, linkType: 'FS', lagDays: 0 })}
                >
                  เพิ่มงานก่อนหน้า
                </Button>
              </Space>
            )}
          </Form.List>
          <Space style={{ display: 'flex' }} size="middle" align="start">
            <Form.Item
              label="วันเริ่มต้น"
              name="start_date"
              rules={[{ required: true, message: 'กรุณาเลือกวันเริ่มต้น' }]}
            >
              <Input placeholder="เลือกวันเริ่มต้น" />
            </Form.Item>
            <Form.Item
              label="วันสิ้นสุด"
              name="end_date"
              rules={[{ required: true, message: 'กรุณาเลือกวันสิ้นสุด' }]}
            >
              <Input placeholder="เลือกวันสิ้นสุด" />
            </Form.Item>
          </Space>
          <Form.Item
            label="% ความคืบหน้า"
            name="progress"
            rules={[{ required: true, message: 'กรุณาระบุความคืบหน้า' }]}
          >
            <InputNumber min={0} max={100} style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
