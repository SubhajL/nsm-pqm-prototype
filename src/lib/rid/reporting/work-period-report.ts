/**
 * PR-29 — งวด-completion report builder.
 *
 * Pure function: takes the project + the WorkPeriod row + its delivery
 * slips; returns a deterministic `RidReportData`. No I/O. Triggered by
 * the UI when the contractor formally requests payment for a งวด (i.e.
 * the WorkPeriod is in `submitted` or `inspection_passed`).
 */

import { formatBaht, formatThaiDate } from '@/lib/date-utils';
import type { DeliverySlip } from '@/types/delivery-slip';
import type { Project } from '@/types/project';
import type { WorkPeriod } from '@/types/work-period';
import { WORK_PERIOD_STATE_LABELS } from '@/types/work-period';
import {
  buildPhotoEvidenceSection,
  buildProjectHeaderSection,
  buildSignatoryBlock,
} from './reporting-helpers';
import type { RidReportData, RidReportSection } from './reporting-types';

export interface BuildWorkPeriodReportInput {
  project: Project;
  workPeriod: WorkPeriod;
  deliverySlips: DeliverySlip[];
  /** Supervising engineer name when known; null leaves the row blank. */
  engineerName: string | null;
  /** ISO 8601 timestamp. The caller supplies this so tests are deterministic. */
  generatedAt: string;
}

export function buildWorkPeriodReport(
  input: BuildWorkPeriodReportInput,
): RidReportData {
  const { project, workPeriod, deliverySlips, engineerName } = input;

  // งวด header.
  const workPeriodHeader: RidReportSection = {
    heading: 'ข้อมูลงวดงาน (Work-Period Information)',
    rows: [
      { label: 'งวดที่ (Period No.)', value: String(workPeriod.number) },
      { label: 'ชื่องวด (Title)', value: workPeriod.title },
      {
        label: 'วันเริ่มตามแผน (Planned Start)',
        value: formatThaiDate(workPeriod.plannedStartDate),
      },
      {
        label: 'วันสิ้นสุดตามแผน (Planned End)',
        value: formatThaiDate(workPeriod.plannedEndDate),
      },
      {
        label: 'สถานะปัจจุบัน (Current State)',
        value: `${WORK_PERIOD_STATE_LABELS[workPeriod.state].th} (${WORK_PERIOD_STATE_LABELS[workPeriod.state].en})`,
      },
    ],
  };

  // Deliverable checklist — one row per deliverable.
  const deliverables: RidReportSection = {
    heading: 'รายการส่งมอบ (Deliverables)',
    rows:
      workPeriod.deliverables.length === 0
        ? [{ label: 'ไม่มีรายการ (No deliverables)', value: '—' }]
        : workPeriod.deliverables.map((text, idx) => ({
            label: `รายการที่ ${idx + 1}`,
            value: text,
          })),
  };

  // Delivery slips — count + reference list.
  const deliverySlipsSection: RidReportSection = {
    heading: 'ใบส่งมอบงาน (Delivery Slips)',
    rows:
      deliverySlips.length === 0
        ? [{ label: 'จำนวน (Count)', value: '0' }]
        : [
            { label: 'จำนวน (Count)', value: String(deliverySlips.length) },
            ...deliverySlips.map((slip, idx) => ({
              label: `ใบที่ ${idx + 1} (${slip.id})`,
              value: formatThaiDate(slip.submittedAt.slice(0, 10)),
            })),
          ],
  };

  // Financial summary.
  const financial: RidReportSection = {
    heading: 'สรุปการเงิน (Financial Summary)',
    rows: [
      { label: 'มูลค่างวด (Period Amount)', value: `${formatBaht(workPeriod.amount)} ฿` },
      {
        label: 'เปอร์เซ็นต์จากสัญญา (% of Contract)',
        value: `${workPeriod.percentage.toFixed(1)}%`,
      },
      { label: 'งบประมาณรวมโครงการ (Project BAC)', value: `${formatBaht(project.budget)} ฿` },
    ],
  };

  // Photo evidence: aggregate attached doc ids across delivery slips.
  const evidenceDocIds = deliverySlips.flatMap((s) => s.attachedDocIds);

  return {
    kind: 'work_period',
    projectId: project.id,
    generatedAt: input.generatedAt,
    periodStart: workPeriod.plannedStartDate,
    periodEnd: workPeriod.plannedEndDate,
    sections: [
      buildProjectHeaderSection(project),
      workPeriodHeader,
      deliverables,
      deliverySlipsSection,
      financial,
      buildPhotoEvidenceSection({ documentIds: evidenceDocIds }),
    ],
    signatories: buildSignatoryBlock({
      managerName: project.managerName ?? null,
      engineerName,
    }),
  };
}
