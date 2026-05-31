/**
 * PMQA Category 6 — Process Management indicators (PR-28).
 *
 * Three indicators rolled up here:
 *
 *   1. `lifecycle_stage_progression` — average # of lifecycle stage
 *      transitions per project per quarter (90 days). Computed as
 *      `sum(transitions) / sum(projectQuarters)`. A project that
 *      transitioned at least once per quarter scores 5.
 *
 *   2. `on_time_stage_transitions_percent` — across every transition
 *      in every project's `lifecycleStageHistory`, the share where the
 *      gap to the previous entry is ≤ 30 days. Standard 90/80/70/60
 *      banding for percent indicators.
 *
 *   3. `quality_gate_pass_rate` — share of all quality gates with
 *      `status === 'passed'`. Pending gates count against the rate so
 *      portfolios with many unresolved gates do not score full marks.
 *      Same percent banding.
 */

import type { Project } from '@/types/project';
import type { QualityGate } from '@/types/quality';
import type { PmqaIndicator, PmqaMaturityScore } from './pmqa-types';
import { scorePercentBand } from './category-2-strategy';

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const DAYS_PER_QUARTER = 90;
const ON_TIME_TRANSITION_THRESHOLD_DAYS = 30;

function scoreProgressionBand(ratio: number): PmqaMaturityScore {
  // Bands for "stage transitions per project per quarter" — explicit per
  // PR-28 spec at 1.00 / 0.75 / 0.50 / 0.25 thresholds.
  if (ratio >= 1) return 5;
  if (ratio >= 0.75) return 4;
  if (ratio >= 0.5) return 3;
  if (ratio >= 0.25) return 2;
  return 1;
}

function getProjectDurationDays(project: Project): number {
  // Prefer the explicit `duration` field when set; fall back to date math
  // so seeds missing the field still contribute.
  if (project.duration && project.duration > 0) return project.duration;
  const start = Date.parse(project.startDate);
  const end = Date.parse(project.endDate);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return 0;
  return (end - start) / MS_PER_DAY;
}

function countTransitions(project: Project): number {
  // A "transition" is every history entry past the auto-seeded first one.
  return Math.max(0, project.lifecycleStageHistory.length - 1);
}

function summarizeOnTimeTransitions(projects: Project[]) {
  let total = 0;
  let onTime = 0;
  projects.forEach((project) => {
    const history = project.lifecycleStageHistory;
    for (let i = 1; i < history.length; i += 1) {
      const prevTime = Date.parse(history[i - 1]!.enteredAt);
      const curTime = Date.parse(history[i]!.enteredAt);
      if (!Number.isFinite(prevTime) || !Number.isFinite(curTime)) continue;
      total += 1;
      const gapDays = (curTime - prevTime) / MS_PER_DAY;
      if (gapDays <= ON_TIME_TRANSITION_THRESHOLD_DAYS) onTime += 1;
    }
  });
  return { total, onTime };
}

function summarizeProgression(projects: Project[]) {
  let totalTransitions = 0;
  let totalQuarters = 0;
  projects.forEach((project) => {
    const durationDays = getProjectDurationDays(project);
    if (durationDays <= 0) return;
    totalQuarters += durationDays / DAYS_PER_QUARTER;
    totalTransitions += countTransitions(project);
  });
  return { totalTransitions, totalQuarters };
}

function summarizeGates(gates: QualityGate[]) {
  // Denominator = every gate in the portfolio. Per PR-28 spec banding,
  // pending gates count against the pass rate — a portfolio with many
  // unfinished gates should not score full marks until they're resolved.
  const passed = gates.filter((g) => g.status === 'passed').length;
  return { total: gates.length, passed };
}

export function computeProcessMaturity(
  projects: Project[],
  qualityGates: QualityGate[],
): PmqaIndicator[] {
  const { totalTransitions, totalQuarters } = summarizeProgression(projects);
  const progressionRatio = totalQuarters > 0 ? totalTransitions / totalQuarters : 0;

  const { total: totalTransitionsForOnTime, onTime } = summarizeOnTimeTransitions(projects);
  const onTimePercent =
    totalTransitionsForOnTime === 0 ? 0 : (onTime / totalTransitionsForOnTime) * 100;

  const { total: totalGates, passed } = summarizeGates(qualityGates);
  const passRatePercent = totalGates === 0 ? 0 : (passed / totalGates) * 100;

  return [
    {
      key: 'lifecycle_stage_progression',
      category: 'category_6_process',
      label: 'อัตราการเปลี่ยนสถานะ (Lifecycle Stage Progression)',
      value: progressionRatio,
      unit: 'ratio',
      score: totalQuarters === 0 ? 1 : scoreProgressionBand(progressionRatio),
      benchmark: 1,
      rationale:
        totalQuarters === 0
          ? 'ไม่มีโครงการที่มีระยะเวลาให้คำนวณ'
          : `${totalTransitions} ทรานซิชันใน ${totalQuarters.toFixed(2)} ไตรมาส-โครงการ`,
    },
    {
      key: 'on_time_stage_transitions_percent',
      category: 'category_6_process',
      label: 'ทรานซิชันตรงเวลา (On-Time Stage Transitions %)',
      value: onTimePercent,
      unit: 'percent',
      score:
        totalTransitionsForOnTime === 0
          ? 1
          : scorePercentBand(onTimePercent),
      benchmark: 90,
      rationale:
        totalTransitionsForOnTime === 0
          ? 'ยังไม่มีทรานซิชันที่บันทึกในระบบ'
          : `${onTime} จาก ${totalTransitionsForOnTime} ทรานซิชันเกิดภายใน ${ON_TIME_TRANSITION_THRESHOLD_DAYS} วันจากขั้นก่อนหน้า`,
    },
    {
      key: 'quality_gate_pass_rate',
      category: 'category_6_process',
      label: 'อัตราผ่าน Quality Gate (Quality Gate Pass Rate)',
      value: passRatePercent,
      unit: 'percent',
      score: totalGates === 0 ? 1 : scorePercentBand(passRatePercent),
      benchmark: 90,
      rationale:
        totalGates === 0
          ? 'ยังไม่มี Quality Gate ในระบบ'
          : `${passed} จาก ${totalGates} เกตได้รับสถานะ passed`,
    },
  ];
}
