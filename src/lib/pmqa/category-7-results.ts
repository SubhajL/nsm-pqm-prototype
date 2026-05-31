/**
 * PMQA Category 7 — Results indicators (PR-28).
 *
 * Three indicators rolled up here:
 *
 *   1. `on_time_percent` — % of projects whose `scheduleHealth` is
 *      `on_schedule`. Projects in `watch` or `delayed` posture count
 *      against this. Projects with the field unset are treated as
 *      on-schedule (matches the executive page's default rendering).
 *
 *   2. `on_budget_percent` — % of projects whose `cpiValue >= 0.95`.
 *      0.95 is the standard ก.พ.ร. threshold for "within tolerance" on
 *      Cost Performance Index.
 *
 *   3. `inspection_completion_rate` — % of ITP items that have at least
 *      one matching `InspectionRecord` (i.e. an inspector has visited
 *      the gate). This is a coverage metric — the ITP itself may still
 *      be open / conditional, but a baseline inspection has taken place.
 *
 * All three use the standard 90/80/70/60 percent banding from
 * `category-2-strategy.ts` for consistency.
 */

import type { Project } from '@/types/project';
import type { InspectionRecord, ITPItem } from '@/types/quality';
import { scorePercentBand } from './category-2-strategy';
import type { PmqaIndicator } from './pmqa-types';

const ON_BUDGET_CPI_THRESHOLD = 0.95;

function isOnSchedule(project: Project): boolean {
  // `scheduleHealth` is optional in the type; treat missing as
  // on-schedule, matching the executive page fallback.
  return (project.scheduleHealth ?? 'on_schedule') === 'on_schedule';
}

function isOnBudget(project: Project): boolean {
  return project.cpiValue >= ON_BUDGET_CPI_THRESHOLD;
}

export function computeResults(
  projects: Project[],
  itpItems: ITPItem[],
  inspections: InspectionRecord[],
): PmqaIndicator[] {
  const totalProjects = projects.length;
  const onTimeCount = projects.filter(isOnSchedule).length;
  const onBudgetCount = projects.filter(isOnBudget).length;

  const onTimePercent = totalProjects === 0 ? 0 : (onTimeCount / totalProjects) * 100;
  const onBudgetPercent = totalProjects === 0 ? 0 : (onBudgetCount / totalProjects) * 100;

  // Build a set of ITP ids that have ≥1 inspection record for O(1) lookup
  // over a single iteration.
  const inspectedItpIds = new Set<string>();
  inspections.forEach((insp) => {
    if (insp.itpId) inspectedItpIds.add(insp.itpId);
  });
  const totalItps = itpItems.length;
  const inspectedItps = itpItems.filter((itp) => inspectedItpIds.has(itp.id)).length;
  const inspectionCompletionPercent =
    totalItps === 0 ? 0 : (inspectedItps / totalItps) * 100;

  return [
    {
      key: 'on_time_percent',
      category: 'category_7_results',
      label: 'เปอร์เซ็นต์โครงการตรงกำหนด (On Time %)',
      value: onTimePercent,
      unit: 'percent',
      score: totalProjects === 0 ? 1 : scorePercentBand(onTimePercent),
      benchmark: 90,
      rationale:
        totalProjects === 0
          ? 'ไม่มีโครงการในขอบเขต'
          : `${onTimeCount} จาก ${totalProjects} โครงการอยู่ในสถานะตรงกำหนด`,
    },
    {
      key: 'on_budget_percent',
      category: 'category_7_results',
      label: 'เปอร์เซ็นต์โครงการตรงงบประมาณ (On Budget %)',
      value: onBudgetPercent,
      unit: 'percent',
      score: totalProjects === 0 ? 1 : scorePercentBand(onBudgetPercent),
      benchmark: 90,
      rationale:
        totalProjects === 0
          ? 'ไม่มีโครงการในขอบเขต'
          : `${onBudgetCount} จาก ${totalProjects} โครงการมี CPI ≥ ${ON_BUDGET_CPI_THRESHOLD}`,
    },
    {
      key: 'inspection_completion_rate',
      category: 'category_7_results',
      label: 'อัตราตรวจ ITP (Inspection Completion Rate)',
      value: inspectionCompletionPercent,
      unit: 'percent',
      score: totalItps === 0 ? 1 : scorePercentBand(inspectionCompletionPercent),
      benchmark: 90,
      rationale:
        totalItps === 0
          ? 'ยังไม่มีรายการ ITP'
          : `${inspectedItps} จาก ${totalItps} รายการ ITP มีบันทึกการตรวจอย่างน้อยหนึ่งครั้ง`,
    },
  ];
}
