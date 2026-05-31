/**
 * PR-29 — Ad-hoc delay report builder.
 *
 * Pure function: takes the project, the project's recent lifecycle
 * history, and the Gantt task list; returns a deterministic
 * `RidReportData` enumerating the watch / delayed activities.
 *
 * The builder is intentionally side-effect free — it calls
 * `deriveTaskScheduleHealth` with a caller-supplied evaluation date so
 * tests don't depend on the wall clock.
 */

import dayjs from 'dayjs';

import { formatThaiDate, formatThaiDateShort } from '@/lib/date-utils';
import { deriveTaskScheduleHealth } from '@/lib/project-progress-derivations';
import type { LifecycleStageHistoryEntry, Project } from '@/types/project';
import type { GanttTask } from '@/types/gantt';
import {
  buildProjectHeaderSection,
  buildSignatoryBlock,
} from './reporting-helpers';
import type { RidReportData, RidReportSection } from './reporting-types';

export interface BuildDelayReportInput {
  project: Project;
  /** Gantt task list (all tasks for the project). */
  ganttTasks: GanttTask[];
  /**
   * Project lifecycle history (already on the project, passed
   * explicitly so the test fixtures don't have to thread through the
   * Project record).
   */
  lifecycleHistory: LifecycleStageHistoryEntry[];
  /**
   * Schedule evaluation date. ISO 8601 (CE) date string. Threaded
   * through to `deriveTaskScheduleHealth` so the snapshot is stable.
   */
  evaluationDate: string;
  /** Supervising engineer name when known; null leaves the row blank. */
  engineerName: string | null;
  /** ISO 8601 timestamp. The caller supplies this so tests are deterministic. */
  generatedAt: string;
}

export function buildDelayReport(input: BuildDelayReportInput): RidReportData {
  const { project, ganttTasks, lifecycleHistory, evaluationDate, engineerName } = input;
  const now = dayjs(evaluationDate);

  // Current schedule health summary.
  const scheduleHealth = project.scheduleHealth ?? 'on_schedule';
  const summary: RidReportSection = {
    heading: 'สถานะตารางเวลาปัจจุบัน (Current Schedule Health)',
    rows: [
      {
        label: 'สถานะ (Health)',
        value: scheduleHealth,
      },
      { label: 'SPI', value: project.spiValue.toFixed(2) },
      {
        label: 'วันที่ประเมิน (Evaluation Date)',
        value: formatThaiDate(evaluationDate),
      },
    ],
  };

  // Lifecycle history excerpt — last three entries.
  const recentLifecycle = lifecycleHistory.slice(-3);
  const lifecycleSection: RidReportSection = {
    heading: 'ประวัติช่วงโครงการล่าสุด (Recent Lifecycle History)',
    rows:
      recentLifecycle.length === 0
        ? [{ label: 'ไม่มีประวัติ (No history)', value: '—' }]
        : recentLifecycle.map((entry, idx) => ({
            label: `รายการที่ ${idx + 1}: ${entry.stage}`,
            value: formatThaiDate(entry.enteredAt.slice(0, 10)),
          })),
  };

  // Watch / delayed activities.
  const watchOrDelayed = ganttTasks
    .filter((task) => task.type === 'task')
    .map((task) => ({ task, health: deriveTaskScheduleHealth(task, now) }))
    .filter(({ health }) => health === 'watch' || health === 'delayed');

  const activities: RidReportSection = {
    heading: 'กิจกรรมที่เสี่ยงหรือล่าช้า (Watch / Delayed Activities)',
    rows:
      watchOrDelayed.length === 0
        ? [{ label: 'ไม่มีกิจกรรมที่เสี่ยง (None)', value: '—' }]
        : watchOrDelayed.map(({ task, health }) => ({
            label: `${task.text} [${health}]`,
            value: `วางแผน: ${formatThaiDateShort(task.start_date)} → ${formatThaiDateShort(task.end_date)}`,
          })),
  };

  // Cause + recovery plan placeholder rows.
  const causeRecovery: RidReportSection = {
    heading: 'สาเหตุและแผนฟื้นฟู (Cause + Recovery Plan)',
    rows: [
      { label: 'สาเหตุของความล่าช้า (Cause)', value: '—' },
      { label: 'แผนฟื้นฟู (Recovery Plan)', value: '—' },
      { label: 'วันที่คาดว่าจะกลับเข้าแผน (Expected Recovery Date)', value: '—' },
    ],
  };

  return {
    kind: 'delay',
    projectId: project.id,
    generatedAt: input.generatedAt,
    // Ad-hoc reports have no fixed period window.
    periodStart: null,
    periodEnd: null,
    sections: [
      buildProjectHeaderSection(project),
      summary,
      lifecycleSection,
      activities,
      causeRecovery,
    ],
    signatories: buildSignatoryBlock({
      managerName: project.managerName ?? null,
      engineerName,
    }),
  };
}
