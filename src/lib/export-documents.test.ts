import { describe, expect, it } from 'vitest';

import { buildRidReportDocument } from './export-documents';
import type { RidReportData } from './rid/reporting/reporting-types';

const monthlyReport: RidReportData = {
  kind: 'monthly',
  projectId: 'proj-001',
  generatedAt: '2026-05-31T00:00:00.000Z',
  periodStart: '2026-05-01',
  periodEnd: '2026-05-31',
  sections: [
    {
      heading: 'ข้อมูลโครงการ (Project Information)',
      rows: [
        { label: 'รหัสโครงการ (Project Code)', value: 'PJ-2569-0012' },
        { label: 'งบประมาณ (Budget)', value: '12,500,000 ฿' },
      ],
    },
    {
      heading: 'ความก้าวหน้าทางการเงิน (Financial Progress)',
      rows: [{ label: 'SPI', value: '0.92' }],
    },
  ],
  signatories: [
    {
      role: 'ผู้จัดการโครงการ (Project Manager)',
      name: 'น.ส.วิภา ขจรศักดิ์',
      signedAt: null,
    },
    {
      role: 'วิศวกรผู้ควบคุมงาน (Supervising Engineer)',
      name: null,
      signedAt: null,
    },
    {
      role: 'พยาน (Witness)',
      name: null,
      signedAt: null,
    },
  ],
};

const delayReport: RidReportData = {
  ...monthlyReport,
  kind: 'delay',
  periodStart: null,
  periodEnd: null,
};

describe('buildRidReportDocument', () => {
  it('emits one table per section + one table for signatories', () => {
    const doc = buildRidReportDocument(monthlyReport);
    expect(doc.tables!.length).toBe(monthlyReport.sections.length + 1);
  });

  it('preserves section ordering verbatim (signatory table is last)', () => {
    const doc = buildRidReportDocument(monthlyReport);
    const titles = doc.tables!.map((t) => t.title);
    expect(titles[0]).toBe('ข้อมูลโครงการ (Project Information)');
    expect(titles[1]).toBe('ความก้าวหน้าทางการเงิน (Financial Progress)');
    expect(titles[titles.length - 1]).toBe('ลายมือชื่อ (Signatories)');
  });

  it('renders signatory row with em-dash placeholders when name/signedAt are null', () => {
    const doc = buildRidReportDocument(monthlyReport);
    const sigTable = doc.tables![doc.tables!.length - 1];
    // Engineer row index = 1; both columns 1 (name) and 2 (signedAt) should be "—"
    expect(sigTable.rows[1][1]).toBe('—');
    expect(sigTable.rows[1][2]).toBe('—');
  });

  it('renders the PM signatory name when present', () => {
    const doc = buildRidReportDocument(monthlyReport);
    const sigTable = doc.tables![doc.tables!.length - 1];
    expect(sigTable.rows[0][1]).toBe('น.ส.วิภา ขจรศักดิ์');
  });

  it('subtitle renders the period range for windowed reports', () => {
    const doc = buildRidReportDocument(monthlyReport);
    // Thai BE formatting: 01/05/2569 – 31/05/2569
    expect(doc.subtitle).toContain('2569');
    expect(doc.subtitle).toContain('–');
  });

  it('subtitle marks ad-hoc reports explicitly', () => {
    const doc = buildRidReportDocument(delayReport);
    expect(doc.subtitle).toContain('Ad-hoc');
  });

  it('filename slug includes the report kind and project id', () => {
    const doc = buildRidReportDocument(monthlyReport);
    expect(doc.filename).toContain('monthly');
    expect(doc.filename).toContain('proj-001');
    expect(doc.filename.endsWith('.pdf')).toBe(true);
  });

  it('title carries bilingual "Thai (English)" label per report kind', () => {
    const monthly = buildRidReportDocument(monthlyReport);
    expect(monthly.title).toContain('รายงานประจำเดือน');
    expect(monthly.title).toContain('Monthly Progress Report');
  });

  it('metadata includes the generatedAt ISO timestamp verbatim', () => {
    const doc = buildRidReportDocument(monthlyReport);
    const stamp = doc.metadata?.find((m) => m.label.includes('Generated At'));
    expect(stamp?.value).toBe('2026-05-31T00:00:00.000Z');
  });
});
