import { describe, expect, it } from 'vitest';

import {
  buildPeriodSection,
  buildPhotoEvidenceSection,
  buildProjectHeaderSection,
  buildSignatoryBlock,
  reportPercent,
} from './reporting-helpers';
import type { Project } from '@/types/project';

const baseProject: Pick<
  Project,
  'code' | 'name' | 'nameEn' | 'budget' | 'startDate' | 'endDate'
> = {
  code: 'PJ-2569-0012',
  name: 'โครงการก่อสร้างฝายทดน้ำห้วยขุนแก้ว ตอน 1',
  nameEn: 'Huai Khun Kaeo Weir Construction (Section 1)',
  budget: 12_500_000,
  startDate: '2026-01-05',
  endDate: '2026-06-30',
};

describe('buildSignatoryBlock', () => {
  it('emits exactly three roles in PM → Engineer → Witness order', () => {
    const sigs = buildSignatoryBlock({
      managerName: 'น.ส.วิภา ขจรศักดิ์',
      engineerName: 'นายกิตติ คงเจริญ',
    });
    expect(sigs).toHaveLength(3);
    expect(sigs[0].role).toBe('ผู้จัดการโครงการ (Project Manager)');
    expect(sigs[1].role).toBe('วิศวกรผู้ควบคุมงาน (Supervising Engineer)');
    expect(sigs[2].role).toBe('พยาน (Witness)');
  });

  it('forwards manager name verbatim and leaves Witness blank for hand-fill', () => {
    const sigs = buildSignatoryBlock({
      managerName: 'น.ส.วิภา ขจรศักดิ์',
      engineerName: 'นายกิตติ คงเจริญ',
    });
    expect(sigs[0].name).toBe('น.ส.วิภา ขจรศักดิ์');
    expect(sigs[1].name).toBe('นายกิตติ คงเจริญ');
    expect(sigs[2].name).toBeNull();
  });

  it('emits engineer row with name=null when engineerName is omitted', () => {
    const sigs = buildSignatoryBlock({ managerName: 'PM' });
    expect(sigs[1].name).toBeNull();
  });

  it('emits manager row with name=null when managerName is null', () => {
    const sigs = buildSignatoryBlock({ managerName: null });
    expect(sigs[0].name).toBeNull();
  });

  it('never auto-fills signedAt (prototype safety guard)', () => {
    const sigs = buildSignatoryBlock({ managerName: 'X', engineerName: 'Y' });
    sigs.forEach((s) => expect(s.signedAt).toBeNull());
  });
});

describe('buildProjectHeaderSection', () => {
  it('renders bilingual heading + six rows in fixed order', () => {
    const section = buildProjectHeaderSection(baseProject);
    expect(section.heading).toBe('ข้อมูลโครงการ (Project Information)');
    expect(section.rows.map((r) => r.label)).toEqual([
      'รหัสโครงการ (Project Code)',
      'ชื่อโครงการ (Project Name)',
      'Project Name (English)',
      'งบประมาณ (Budget)',
      'วันที่เริ่ม (Start Date)',
      'วันที่สิ้นสุด (End Date)',
    ]);
  });

  it('formats budget with Thai baht thousands grouping', () => {
    const section = buildProjectHeaderSection(baseProject);
    const budget = section.rows.find((r) => r.label.startsWith('งบประมาณ'))!;
    // 12,500,000 in th-TH locale, with the ฿ suffix
    expect(budget.value).toMatch(/12.500.000.*฿/);
  });

  it('renders start + end dates in Thai BE (CE + 543)', () => {
    const section = buildProjectHeaderSection(baseProject);
    const start = section.rows.find((r) => r.label.startsWith('วันที่เริ่ม'))!;
    const end = section.rows.find((r) => r.label.startsWith('วันที่สิ้นสุด'))!;
    // 2026 + 543 = 2569
    expect(start.value).toBe('05/01/2569');
    expect(end.value).toBe('30/06/2569');
  });
});

describe('buildPeriodSection', () => {
  it('renders both dates in Thai BE', () => {
    const section = buildPeriodSection({
      periodStart: '2026-05-01',
      periodEnd: '2026-05-31',
    });
    expect(section.heading).toBe('ช่วงเวลารายงาน (Reporting Period)');
    expect(section.rows[0]).toEqual({ label: 'ตั้งแต่ (From)', value: '01/05/2569' });
    expect(section.rows[1]).toEqual({ label: 'ถึง (To)', value: '31/05/2569' });
  });
});

describe('buildPhotoEvidenceSection', () => {
  it('renders count + em-dash placeholder when no documents', () => {
    const section = buildPhotoEvidenceSection({ documentIds: [] });
    expect(section.rows[0].value).toBe('0');
    expect(section.rows[1].value).toBe('—');
  });

  it('lists only the most-recent 3 ids, comma-joined', () => {
    const section = buildPhotoEvidenceSection({
      documentIds: ['doc-1', 'doc-2', 'doc-3', 'doc-4', 'doc-5'],
    });
    expect(section.rows[0].value).toBe('5');
    expect(section.rows[1].value).toBe('doc-3, doc-4, doc-5');
  });
});

describe('reportPercent', () => {
  it('rounds to whole percent', () => {
    expect(reportPercent(0.654)).toBe('65%');
    expect(reportPercent(0.658)).toBe('66%');
    expect(reportPercent(0)).toBe('0%');
    expect(reportPercent(1)).toBe('100%');
  });
});
