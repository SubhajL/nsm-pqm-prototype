/**
 * PR-29 — RID reporting helpers.
 *
 * Pure helpers shared across the three `build*Report` builders. No I/O,
 * no `Date.now()`, no random ids — every input that affects the output
 * is passed by the caller so snapshot tests are deterministic.
 */

import { formatBaht, formatPercent, formatThaiDate } from '@/lib/date-utils';
import type { Project } from '@/types/project';
import type { RidReportSection, RidReportSignatory } from './reporting-types';

/**
 * Standard RID e-GP signatory block. Three roles, bilingual labels.
 * `engineerName` is optional — when absent the engineer row is emitted
 * with `name: null` for hand-fill at sign-off.
 */
export function buildSignatoryBlock(options: {
  managerName: string | null;
  engineerName?: string | null;
}): RidReportSignatory[] {
  return [
    {
      role: 'ผู้จัดการโครงการ (Project Manager)',
      name: options.managerName ?? null,
      signedAt: null,
    },
    {
      role: 'วิศวกรผู้ควบคุมงาน (Supervising Engineer)',
      name: options.engineerName ?? null,
      signedAt: null,
    },
    {
      role: 'พยาน (Witness)',
      name: null,
      signedAt: null,
    },
  ];
}

/**
 * Bilingual "Project header" section common to every report family.
 * Pulls only the fields a stakeholder needs at the top of the cover
 * page so the layout matches RID's contract-management binder cover
 * sheets.
 */
export function buildProjectHeaderSection(
  project: Pick<Project, 'code' | 'name' | 'nameEn' | 'budget' | 'startDate' | 'endDate'>,
): RidReportSection {
  return {
    heading: 'ข้อมูลโครงการ (Project Information)',
    rows: [
      { label: 'รหัสโครงการ (Project Code)', value: project.code },
      { label: 'ชื่อโครงการ (Project Name)', value: project.name },
      { label: 'Project Name (English)', value: project.nameEn },
      { label: 'งบประมาณ (Budget)', value: `${formatBaht(project.budget)} ฿` },
      { label: 'วันที่เริ่ม (Start Date)', value: formatThaiDate(project.startDate) },
      { label: 'วันที่สิ้นสุด (End Date)', value: formatThaiDate(project.endDate) },
    ],
  };
}

/**
 * Bilingual "Reporting period" section. Renders period start / end in
 * Thai BE format. Pass nulls for ad-hoc reports — the section is then
 * omitted by the builder, callers should not call this with nulls.
 */
export function buildPeriodSection(options: {
  periodStart: string;
  periodEnd: string;
}): RidReportSection {
  return {
    heading: 'ช่วงเวลารายงาน (Reporting Period)',
    rows: [
      { label: 'ตั้งแต่ (From)', value: formatThaiDate(options.periodStart) },
      { label: 'ถึง (To)', value: formatThaiDate(options.periodEnd) },
    ],
  };
}

/**
 * Photo / document evidence placeholder. RID's live forms embed photo
 * thumbnails per period; the prototype just lists counts + recent ids.
 */
export function buildPhotoEvidenceSection(options: {
  documentIds: string[];
}): RidReportSection {
  const total = options.documentIds.length;
  const recent = options.documentIds.slice(-3).join(', ') || '—';
  return {
    heading: 'หลักฐานภาพถ่าย (Photo / Document Evidence)',
    rows: [
      { label: 'จำนวนเอกสารแนบ (Attached Documents)', value: String(total) },
      { label: 'รหัสล่าสุด (Most-recent IDs)', value: recent },
    ],
  };
}

/**
 * Format a fraction (e.g. 0.654) as the percent string used in report
 * cells (e.g. `65%`). Wraps `formatPercent` so the call-site reads as
 * intent rather than a generic format call.
 */
export function reportPercent(fraction: number): string {
  return formatPercent(fraction);
}
