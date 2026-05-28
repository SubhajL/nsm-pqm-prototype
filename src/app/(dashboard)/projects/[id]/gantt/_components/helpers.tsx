import { Tag } from 'antd';
import dayjs from 'dayjs';

import type { GanttLink, GanttTask, GanttTaskInput, GanttLinkType } from '@/types/gantt';
import {
  deriveTaskGroupScheduleHealth,
  deriveTaskScheduleHealth,
  getExecutableGanttTasks,
  getScheduleEvaluationDate,
  type TaskScheduleHealth,
} from '@/lib/project-progress-derivations';

import {
  COLOR_COMPLETED,
  COLOR_IN_PROGRESS,
  COLOR_NOT_STARTED,
  PX_PER_DAY,
  PX_PER_WEEK,
  type GanttRow,
  type GanttTaskFormValues,
  type TimelineConfig,
  type TimeScale,
} from './constants';

/** Calculate explicit timeline column width for day/week scales */
export function getTimelineColumnWidth(timeScale: TimeScale, totalDays: number): number | undefined {
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
export function getColumnWidths(timeScale: TimeScale) {
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

export function formatDependencyLabel(sourceLabel: string, linkType: GanttLinkType, lagDays: number) {
  const lagLabel =
    lagDays === 0 ? '' : lagDays > 0 ? ` +${lagDays} วัน` : ` ${lagDays} วัน`;
  return `${sourceLabel} (${linkType}${lagLabel})`;
}

export function parseFormDate(value: GanttTaskFormValues['start_date']) {
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

export function getBarMetrics(
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

export function getTimelineOffsetPct(date: dayjs.Dayjs, timeline: TimelineConfig) {
  const rawPct = (date.diff(timeline.projectStart, 'day') / timeline.totalDays) * 100;
  return Math.min(100, Math.max(0, rawPct));
}

export function getProgressColor(progress: number): string {
  if (progress >= 1) return COLOR_COMPLETED;
  if (progress > 0) return COLOR_IN_PROGRESS;
  return COLOR_NOT_STARTED;
}

export function getStatusTag(progress: number, type: string) {
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
export function buildTree(tasks: GanttTask[]): GanttRow[] {
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
export function getMonthLabels(timeline: TimelineConfig): { label: string; leftPct: number; widthPct: number }[] {
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
export function getWeekLabels(timeline: TimelineConfig): { label: string; leftPct: number; widthPct: number }[] {
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
export function getDayLabels(timeline: TimelineConfig): { label: string; leftPct: number; widthPct: number }[] {
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
export function getTimelineLabels(timeline: TimelineConfig, timeScale: TimeScale) {
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

export function buildTimelineConfig(
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

/** Build per-task schedule health map (tasks only) */
export function buildTaskScheduleHealthById(
  rows: GanttTask[],
  today: dayjs.Dayjs,
): Map<number, TaskScheduleHealth> {
  return new Map(
    rows
      .filter((task) => task.type === 'task')
      .map((task) => [task.id, deriveTaskScheduleHealth(task, today)]),
  );
}

/** Build per-parent (project) schedule health map */
export function buildProjectScheduleHealthByParentId(
  rows: GanttTask[],
  today: dayjs.Dayjs,
): Map<number, TaskScheduleHealth> {
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
          today,
        ),
      ]),
  );
}

/** Build map of target task ID → list of predecessor display labels */
export function buildPredecessorLabelsByTargetId(
  rows: GanttTask[],
  links: GanttLink[],
): Map<number, string[]> {
  const labelsById = new Map(rows.map((task) => [task.id, task.text]));
  const map = new Map<number, string[]>();

  links.forEach((link) => {
    const sourceLabel = labelsById.get(link.source);
    if (!sourceLabel) {
      return;
    }

    const entries = map.get(link.target) ?? [];
    entries.push(formatDependencyLabel(sourceLabel, link.type, link.lagDays ?? 0));
    map.set(link.target, entries);
  });

  return map;
}

/** Build the initial form values when opening for edit */
export function buildEditFormValues(
  editingTask: GanttTask,
  links: GanttLink[],
): GanttTaskFormValues {
  return {
    text: editingTask.text,
    owner: editingTask.owner,
    start_date: dayjs(editingTask.start_date).format('DD/MM/YYYY'),
    end_date: dayjs(editingTask.end_date).format('DD/MM/YYYY'),
    progress: Math.round(editingTask.progress * 100),
    parent: editingTask.parent,
    type: editingTask.type,
    predecessors: links
      .filter((link) => link.target === editingTask.id)
      .map((link) => ({
        taskId: link.source,
        linkType: link.type,
        lagDays: link.lagDays ?? 0,
      })),
  };
}

/** Build the initial form values when opening for create */
export function buildCreateFormValues(
  ownerName: string,
  projectStartDate: string | undefined,
): GanttTaskFormValues {
  return {
    text: '',
    owner: ownerName,
    start_date: projectStartDate
      ? dayjs(projectStartDate).format('DD/MM/YYYY')
      : dayjs().format('DD/MM/YYYY'),
    end_date: projectStartDate
      ? dayjs(projectStartDate).add(7, 'day').format('DD/MM/YYYY')
      : dayjs().add(7, 'day').format('DD/MM/YYYY'),
    progress: 0,
    parent: 0,
    type: 'task',
    predecessors: [],
  };
}

/** Convert a validated form values object into a GanttTaskInput payload */
export function buildTaskInputFromForm(
  values: GanttTaskFormValues,
  startDate: dayjs.Dayjs,
  endDate: dayjs.Dayjs,
): GanttTaskInput {
  return {
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
}
