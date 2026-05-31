import { describe, expect, it } from 'vitest';

import { buildWorkPeriodReport } from './work-period-report';
import type { Project } from '@/types/project';
import type { WorkPeriod } from '@/types/work-period';
import type { DeliverySlip } from '@/types/delivery-slip';

const FIXED_GENERATED_AT = '2026-05-31T00:00:00.000Z';

const project: Project = {
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

const workPeriod: WorkPeriod = {
  id: 'wp-001',
  projectId: 'proj-001',
  milestoneId: null,
  number: 2,
  title: 'งวดที่ 2 — งานฐานราก',
  deliverables: ['ฐานรากเสร็จ 100%', 'รายงาน QC ฐานราก'],
  plannedStartDate: '2026-03-01',
  plannedEndDate: '2026-04-30',
  amount: 2_500_000,
  percentage: 20,
  state: 'inspection_passed',
  createdAt: '2026-03-01T00:00:00.000Z',
  updatedAt: '2026-04-30T00:00:00.000Z',
};

const slip1: DeliverySlip = {
  id: 'slip-001',
  workPeriodId: 'wp-001',
  submittedAt: '2026-04-30T12:00:00.000Z',
  submittedBy: 'user-002',
  attachedDocIds: ['doc-101', 'doc-102'],
  notes: 'ส่งมอบครั้งแรก',
};

const slip2: DeliverySlip = {
  id: 'slip-002',
  workPeriodId: 'wp-001',
  submittedAt: '2026-05-02T09:00:00.000Z',
  submittedBy: 'user-002',
  attachedDocIds: ['doc-103'],
  notes: 'แก้ไขเพิ่มเติม',
};

describe('buildWorkPeriodReport', () => {
  it('returns deterministic snapshot with slips + deliverables', () => {
    const report = buildWorkPeriodReport({
      project,
      workPeriod,
      deliverySlips: [slip1, slip2],
      engineerName: 'นายกิตติ คงเจริญ',
      generatedAt: FIXED_GENERATED_AT,
    });
    expect(report).toMatchSnapshot();
  });

  it('renders empty-deliverable + empty-slip placeholder snapshot', () => {
    const empty: WorkPeriod = { ...workPeriod, deliverables: [] };
    const report = buildWorkPeriodReport({
      project,
      workPeriod: empty,
      deliverySlips: [],
      engineerName: null,
      generatedAt: FIXED_GENERATED_AT,
    });
    expect(report).toMatchSnapshot();
  });

  it('aggregates photo evidence across all delivery slips', () => {
    const report = buildWorkPeriodReport({
      project,
      workPeriod,
      deliverySlips: [slip1, slip2],
      engineerName: null,
      generatedAt: FIXED_GENERATED_AT,
    });
    const photo = report.sections.find((s) =>
      s.heading.includes('หลักฐานภาพถ่าย'),
    )!;
    expect(photo.rows[0].value).toBe('3');
  });

  it('uses planned start/end as periodStart/periodEnd', () => {
    const report = buildWorkPeriodReport({
      project,
      workPeriod,
      deliverySlips: [],
      engineerName: null,
      generatedAt: FIXED_GENERATED_AT,
    });
    expect(report.periodStart).toBe('2026-03-01');
    expect(report.periodEnd).toBe('2026-04-30');
  });

  it('exposes work-period state in bilingual Thai (English) format', () => {
    const report = buildWorkPeriodReport({
      project,
      workPeriod,
      deliverySlips: [],
      engineerName: null,
      generatedAt: FIXED_GENERATED_AT,
    });
    const wpSection = report.sections.find((s) =>
      s.heading.includes('งวดงาน'),
    )!;
    const stateRow = wpSection.rows.find((r) => r.label.startsWith('สถานะปัจจุบัน'))!;
    expect(stateRow.value).toContain('ตรวจรับผ่าน');
    expect(stateRow.value).toContain('Inspection Passed');
  });
});
