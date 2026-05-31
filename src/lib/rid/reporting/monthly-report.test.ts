import { describe, expect, it } from 'vitest';

import { buildMonthlyReport } from './monthly-report';
import type { Project } from '@/types/project';
import type { EVMDataPoint } from '@/types/evm';

const FIXED_GENERATED_AT = '2026-05-31T00:00:00.000Z';

const outsourcedProject: Project = {
  id: 'proj-001',
  code: 'PJ-2569-0012',
  name: 'โครงการก่อสร้างฝายทดน้ำห้วยขุนแก้ว ตอน 1',
  nameEn: 'Huai Khun Kaeo Weir Construction (Section 1)',
  projectClass: 'construction',
  deliveryMethod: 'outsourced',
  contractingModel: 'lump_sum',
  sizeTier: 'medium',
  status: 'in_progress',
  budget: 12_500_000,
  progress: 0.65,
  scheduleHealth: 'watch',
  startDate: '2026-01-05',
  endDate: '2026-06-30',
  duration: 177,
  spiValue: 0.92,
  cpiValue: 1.05,
  managerId: 'user-002',
  managerName: 'น.ส.วิภา ขจรศักดิ์',
  departmentId: 'dept-002-1',
  departmentName: 'กองพัฒนาโครงการ',
  openIssues: 0,
  highRisks: 0,
  currentMilestone: 3,
  totalMilestones: 5,
  currentLifecycleStage: 'construction',
  lifecycleStageHistory: [
    { stage: 'planning', enteredAt: '2026-01-05T00:00:00.000Z', enteredBy: null, artifactDocIds: [] },
  ],
};

const inHouseProject: Project = {
  ...outsourcedProject,
  id: 'proj-009',
  deliveryMethod: 'in_house',
  scheduleHealth: 'on_schedule',
};

const evmDataOutsourced: EVMDataPoint[] = [
  {
    id: 'evm-1',
    projectId: 'proj-001',
    month: '2026-04',
    monthThai: 'เม.ย. 69',
    pv: 5_000_000,
    ev: 4_600_000,
    ac: 4_700_000,
    paidToDate: 4_700_000,
    spi: 0.92,
    cpi: 0.98,
  },
  {
    id: 'evm-2',
    projectId: 'proj-001',
    month: '2026-05',
    monthThai: 'พ.ค. 69',
    pv: 8_125_000,
    ev: 8_000_000,
    ac: 7_500_000,
    paidToDate: 7_500_000,
    spi: 0.98,
    cpi: 1.07,
  },
];

const evmDataInHouse: EVMDataPoint[] = [
  {
    id: 'evm-h-1',
    projectId: 'proj-009',
    month: '2026-05',
    monthThai: 'พ.ค. 69',
    pv: 8_000_000,
    ev: 7_500_000,
    ac: 7_200_000,
    spi: 0.94,
    cpi: 1.04,
  },
];

describe('buildMonthlyReport', () => {
  it('returns a deterministic snapshot for outsourced + watch project', () => {
    const report = buildMonthlyReport({
      project: outsourcedProject,
      evmData: evmDataOutsourced,
      periodStart: '2026-05-01',
      periodEnd: '2026-05-31',
      evidenceDocIds: ['doc-101', 'doc-102', 'doc-103', 'doc-104'],
      engineerName: 'นายกิตติ คงเจริญ',
      generatedAt: FIXED_GENERATED_AT,
    });
    expect(report).toMatchSnapshot();
  });

  it('returns a deterministic snapshot for in-house + on-schedule project', () => {
    const report = buildMonthlyReport({
      project: inHouseProject,
      evmData: evmDataInHouse,
      periodStart: '2026-05-01',
      periodEnd: '2026-05-31',
      evidenceDocIds: [],
      engineerName: null,
      generatedAt: FIXED_GENERATED_AT,
    });
    expect(report).toMatchSnapshot();
  });

  it('handles missing EVM data without throwing', () => {
    const report = buildMonthlyReport({
      project: outsourcedProject,
      evmData: [],
      periodStart: '2026-05-01',
      periodEnd: '2026-05-31',
      evidenceDocIds: [],
      engineerName: null,
      generatedAt: FIXED_GENERATED_AT,
    });
    expect(report.kind).toBe('monthly');
    expect(report.sections.length).toBeGreaterThan(0);
    // Financial section must surface a "no EVM" placeholder note.
    const financial = report.sections.find((s) =>
      s.heading.includes('Financial'),
    );
    expect(financial).toBeDefined();
    expect(
      financial!.rows.some((r) => r.value === 'ยังไม่มีข้อมูลงวด EVM'),
    ).toBe(true);
  });

  it('emits 3 signatories in PM → Engineer → Witness order', () => {
    const report = buildMonthlyReport({
      project: outsourcedProject,
      evmData: evmDataOutsourced,
      periodStart: '2026-05-01',
      periodEnd: '2026-05-31',
      evidenceDocIds: [],
      engineerName: 'นายกิตติ คงเจริญ',
      generatedAt: FIXED_GENERATED_AT,
    });
    expect(report.signatories.map((s) => s.role)).toEqual([
      'ผู้จัดการโครงการ (Project Manager)',
      'วิศวกรผู้ควบคุมงาน (Supervising Engineer)',
      'พยาน (Witness)',
    ]);
  });

  it('uses the caller-supplied generatedAt verbatim', () => {
    const report = buildMonthlyReport({
      project: outsourcedProject,
      evmData: [],
      periodStart: '2026-05-01',
      periodEnd: '2026-05-31',
      evidenceDocIds: [],
      engineerName: null,
      generatedAt: FIXED_GENERATED_AT,
    });
    expect(report.generatedAt).toBe(FIXED_GENERATED_AT);
  });
});
