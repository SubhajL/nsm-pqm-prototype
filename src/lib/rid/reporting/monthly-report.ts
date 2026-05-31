/**
 * PR-29 — Monthly progress report builder.
 *
 * Pure function: takes the project, EVM time-series, the report period,
 * and the document ids for evidence; returns a deterministic
 * `RidReportData`. No I/O, no `Date.now()`. The caller is responsible
 * for filtering EVM points to the period and looking up the manager's
 * supervising engineer.
 */

import { formatBaht } from '@/lib/date-utils';
import { deriveEvmMetrics } from '@/lib/evm-metrics';
import type { EVMDataPoint } from '@/types/evm';
import type { Project } from '@/types/project';
import {
  buildPeriodSection,
  buildPhotoEvidenceSection,
  buildProjectHeaderSection,
  buildSignatoryBlock,
  reportPercent,
} from './reporting-helpers';
import type { RidReportData } from './reporting-types';

export interface BuildMonthlyReportInput {
  project: Project;
  evmData: EVMDataPoint[];
  periodStart: string; // ISO date
  periodEnd: string; // ISO date
  /** Document ids attached as evidence in the period. */
  evidenceDocIds: string[];
  /** Supervising engineer name when known; null leaves the row blank. */
  engineerName: string | null;
  /** ISO 8601 timestamp. The caller supplies this so tests are deterministic. */
  generatedAt: string;
}

export function buildMonthlyReport(input: BuildMonthlyReportInput): RidReportData {
  const { project, evmData, periodStart, periodEnd, evidenceDocIds, engineerName } = input;

  const metrics = deriveEvmMetrics(project, evmData);

  // Period summary (narrative scaffolding — RID's live forms have
  // free-text rows; the prototype emits the structural labels so the
  // PM can fill them in on the printed PDF).
  const periodSummary = {
    heading: 'สรุปการดำเนินงานในงวด (Period Summary)',
    rows: [
      { label: 'กิจกรรมตามแผน (Planned Activities)', value: '—' },
      { label: 'กิจกรรมที่ทำจริง (Actual Activities)', value: '—' },
      { label: 'ส่วนต่างจากแผน (Deviations from Plan)', value: '—' },
    ],
  };

  // Physical progress. EV / BAC × 100 if metrics are available; falls
  // back to the project's stored progress field otherwise.
  const physicalProgressFraction = metrics
    ? metrics.bac > 0
      ? metrics.ev / metrics.bac
      : project.progress
    : project.progress;
  const physicalProgress = {
    heading: 'ความก้าวหน้าทางกายภาพ (Physical Progress)',
    rows: [
      {
        label: 'ความก้าวหน้าตามแผน (Planned %)',
        value: metrics ? `${(metrics.evPercent).toFixed(1)}%` : reportPercent(project.progress),
      },
      {
        label: 'ความก้าวหน้าจริง (Actual %)',
        value: reportPercent(physicalProgressFraction),
      },
      {
        label: 'ความก้าวหน้าสะสม (Cumulative %)',
        value: reportPercent(project.progress),
      },
    ],
  };

  // Financial progress.
  const financialRows = (() => {
    if (!metrics) {
      return [
        { label: 'งบประมาณรวม (BAC)', value: `${formatBaht(project.budget)} ฿` },
        { label: 'หมายเหตุ (Note)', value: 'ยังไม่มีข้อมูลงวด EVM' },
      ];
    }
    if (metrics.mode === 'in_house') {
      return [
        { label: 'งบประมาณรวม (BAC)', value: `${formatBaht(metrics.bac)} ฿` },
        { label: 'มูลค่างานที่ได้ (EV)', value: `${formatBaht(metrics.ev)} ฿` },
        { label: 'ค่าใช้จ่ายจริง (AC)', value: `${formatBaht(metrics.ac)} ฿` },
        { label: 'SPI', value: metrics.spi.toFixed(2) },
        { label: 'CPI', value: metrics.cpi.toFixed(2) },
      ];
    }
    return [
      { label: 'งบประมาณรวม (BAC)', value: `${formatBaht(metrics.bac)} ฿` },
      { label: 'มูลค่างานที่ได้ (EV)', value: `${formatBaht(metrics.ev)} ฿` },
      { label: 'จ่ายแล้ว (Paid to Date)', value: `${formatBaht(metrics.paidToDate)} ฿` },
      { label: 'SPI', value: metrics.spi.toFixed(2) },
      { label: 'จ่ายเทียบ BAC (Paid / BAC %)', value: `${metrics.paidPercent.toFixed(1)}%` },
    ];
  })();
  const financialProgress = {
    heading: 'ความก้าวหน้าทางการเงิน (Financial Progress)',
    rows: financialRows,
  };

  // Delay analysis. We do not derive Gantt task health here — that
  // requires the gantt fixture and lives in the dedicated delay report.
  // The monthly report just affirms or warns based on scheduleHealth.
  const scheduleHealth = project.scheduleHealth ?? 'on_schedule';
  const delayLabel = (() => {
    switch (scheduleHealth) {
      case 'delayed':
        return 'โครงการล่าช้า (Delayed) — ดูรายละเอียดในรายงานความล่าช้า';
      case 'watch':
        return 'ต้องเฝ้าระวัง (Watch) — มีกิจกรรมเสี่ยงต่อความล่าช้า';
      case 'on_schedule':
      default:
        return 'ตรงตามแผน (On Schedule)';
    }
  })();
  const delayAnalysis = {
    heading: 'การวิเคราะห์ความล่าช้า (Delay Analysis)',
    rows: [{ label: 'สถานะตารางเวลา (Schedule Health)', value: delayLabel }],
  };

  return {
    kind: 'monthly',
    projectId: project.id,
    generatedAt: input.generatedAt,
    periodStart,
    periodEnd,
    sections: [
      buildProjectHeaderSection(project),
      buildPeriodSection({ periodStart, periodEnd }),
      periodSummary,
      physicalProgress,
      financialProgress,
      delayAnalysis,
      buildPhotoEvidenceSection({ documentIds: evidenceDocIds }),
    ],
    signatories: buildSignatoryBlock({
      managerName: project.managerName ?? null,
      engineerName,
    }),
  };
}
