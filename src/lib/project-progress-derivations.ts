import dayjs from 'dayjs';
import type { Project } from '@/types/project';
import type { ProjectStatus, ProjectScheduleHealth } from '@/types/project';
import type { EVMDataPoint } from '@/types/evm';
import type { GanttTask } from '@/types/gantt';
import type { WBSNode } from '@/hooks/useWBS';

export interface WeightingRow {
  key: string;
  wbs: string;
  activity: string;
  weight: number;
  completion: number;
  weighted: number;
}

export interface PhysicalProgressRow {
  key: string;
  name: string;
  actual: number;
  planned: number;
  unit: string;
  percent: number;
}

export interface EvmSummary {
  bac: number;
  pv: number;
  ev: number;
  ac: number;
  spi: number;
  cpi: number;
  eac: number;
  tcpi: number;
  evPercent: number;
}

export type TaskScheduleHealth = ProjectScheduleHealth | 'not_started';

export function clampPercent(value: number) {
  return Math.min(100, Math.max(0, value));
}

export function normalizeMatchKey(value: string) {
  return value.trim().replace(/\s+/g, ' ').toLocaleLowerCase();
}

export function buildWeightingRows(nodes: WBSNode[]) {
  return nodes
    .filter((node) => node.level === 1)
    .sort((a, b) => a.code.localeCompare(b.code, 'th'))
    .map<WeightingRow>((node) => ({
      key: node.id,
      wbs: node.code,
      activity: node.name,
      weight: node.weight,
      completion: node.progress,
      weighted: (node.weight * node.progress) / 100,
    }));
}

export function getTotalWeightedProgress(rows: WeightingRow[]) {
  return rows.reduce((sum, row) => sum + row.weighted, 0);
}

export function buildPhysicalRows(nodes: WBSNode[], limit = 3) {
  return nodes
    .filter((node) => node.level > 0 && node.hasBOQ)
    .sort((a, b) => a.code.localeCompare(b.code, 'th'))
    .slice(0, limit)
    .map<PhysicalProgressRow>((node) => ({
      key: node.id,
      name: node.name,
      actual: Math.round(node.progress),
      planned: 100,
      unit: '%',
      percent: clampPercent(node.progress),
    }));
}

export function getAveragePhysicalProgress(rows: PhysicalProgressRow[]) {
  if (rows.length === 0) return 0;
  return rows.reduce((sum, row) => sum + row.percent, 0) / rows.length;
}

export function buildEvmSummary(
  project: Project | undefined,
  evmData: EVMDataPoint[] | undefined,
): EvmSummary {
  const bac = project?.budget ?? 0;
  const latest = evmData?.[evmData.length - 1];
  const pv = latest?.pv ?? 0;
  const ev = latest?.ev ?? Math.round(bac * (project?.progress ?? 0));
  const ac = latest?.ac ?? 0;
  const spi = latest?.spi ?? (pv > 0 ? ev / pv : 0);
  const cpi = latest?.cpi ?? (ac > 0 ? ev / ac : 0);
  const eac = cpi > 0 ? bac / cpi : bac;
  const tcpi = bac > ac ? (bac - ev) / Math.max(bac - ac, 1) : 0;
  const evPercent = bac > 0 ? (ev / bac) * 100 : 0;

  return {
    bac,
    pv,
    ev,
    ac,
    spi,
    cpi,
    eac,
    tcpi,
    evPercent: clampPercent(evPercent),
  };
}

const DEMO_CURRENT_DATE = '2026-03-17';
const MANUAL_PROJECT_STATUSES: ProjectStatus[] = ['draft', 'on_hold', 'cancelled'];
const WATCH_SLIP_DAYS = 3;
const WATCH_DUE_SOON_DAYS = 7;

export function getExecutableGanttTasks(tasks: GanttTask[]) {
  return tasks.filter((task) => task.type === 'task');
}

function isCompletedTask(task: GanttTask) {
  return clampPercent(task.progress * 100) >= 100;
}

export function getScheduleEvaluationDate() {
  return dayjs(DEMO_CURRENT_DATE);
}

function getTaskForecastFinishDate(task: GanttTask, now: dayjs.Dayjs) {
  const taskProgress = Math.min(Math.max(task.progress, 0), 1);
  const taskStart = dayjs(task.start_date);
  const elapsedDays = Math.max(now.diff(taskStart, 'day') + 1, 1);

  if (taskProgress <= 0 || taskStart.isAfter(now, 'day')) {
    return null;
  }

  const estimatedTotalDays = elapsedDays / taskProgress;
  const estimatedRemainingDays = Math.max(
    Math.ceil(estimatedTotalDays - elapsedDays),
    0,
  );

  return now.add(estimatedRemainingDays, 'day');
}

export function deriveTaskScheduleHealth(
  task: GanttTask,
  now = getScheduleEvaluationDate(),
): TaskScheduleHealth {
  if (task.type !== 'task' || isCompletedTask(task)) {
    return 'on_schedule';
  }

  const taskStart = dayjs(task.start_date);
  const taskEnd = dayjs(task.end_date);
  const taskProgress = Math.min(Math.max(task.progress, 0), 1);

  if (taskProgress <= 0 || taskStart.isAfter(now, 'day')) {
    return 'not_started';
  }

  if (now.isAfter(taskEnd, 'day')) {
    return 'delayed';
  }

  const forecastFinish = getTaskForecastFinishDate(task, now);
  const slipDays = forecastFinish ? forecastFinish.diff(taskEnd, 'day') : 0;
  if (slipDays > WATCH_SLIP_DAYS) {
    return 'delayed';
  }
  if (slipDays > 0) {
    return 'watch';
  }

  const daysUntilPlannedFinish = taskEnd.diff(now, 'day');
  if (daysUntilPlannedFinish <= WATCH_DUE_SOON_DAYS) {
    return 'watch';
  }

  return 'on_schedule';
}

export function deriveTaskGroupScheduleHealth(
  tasks: GanttTask[],
  now = getScheduleEvaluationDate(),
): TaskScheduleHealth {
  const executableTasks = getExecutableGanttTasks(tasks);

  if (executableTasks.length === 0) {
    return 'not_started';
  }

  const taskStates = executableTasks.map((task) =>
    deriveTaskScheduleHealth(task, now),
  );

  if (taskStates.includes('delayed')) {
    return 'delayed';
  }
  if (taskStates.includes('watch')) {
    return 'watch';
  }
  if (taskStates.includes('on_schedule')) {
    return 'on_schedule';
  }

  return 'not_started';
}

export function deriveProjectScheduleHealth(
  tasks: GanttTask[],
  now = getScheduleEvaluationDate(),
): ProjectScheduleHealth {
  const groupHealth = deriveTaskGroupScheduleHealth(tasks, now);
  return groupHealth === 'not_started' ? 'on_schedule' : groupHealth;
}

export function deriveAutoProjectStatus(
  currentStatus: ProjectStatus,
  progressRatio: number,
  tasks: GanttTask[],
): ProjectStatus {
  if (MANUAL_PROJECT_STATUSES.includes(currentStatus)) {
    return currentStatus;
  }

  const executableTasks = getExecutableGanttTasks(tasks);
  const normalizedProgress = Math.min(1, Math.max(0, progressRatio));
  const hasStarted =
    normalizedProgress > 0 || executableTasks.some((task) => clampPercent(task.progress * 100) > 0);
  const allTasksCompleted =
    executableTasks.length > 0 && executableTasks.every((task) => isCompletedTask(task));

  if (normalizedProgress >= 1 || allTasksCompleted) {
    return 'completed';
  }

  if (hasStarted) {
    return 'in_progress';
  }

  return 'planning';
}
