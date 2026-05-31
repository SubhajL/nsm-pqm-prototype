import { describe, expect, it } from 'vitest';

import { buildDelayReport } from './delay-report';
import type { Project } from '@/types/project';
import type { GanttTask } from '@/types/gantt';

const FIXED_GENERATED_AT = '2026-05-31T00:00:00.000Z';
const FIXED_EVAL_DATE = '2026-05-15';

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
  progress: 0.55,
  scheduleHealth: 'delayed',
  startDate: '2026-01-05',
  endDate: '2026-06-30',
  duration: 177,
  spiValue: 0.78,
  cpiValue: 1.02,
  managerId: 'user-002',
  managerName: 'น.ส.วิภา ขจรศักดิ์',
  departmentId: 'dept-002-1',
  departmentName: 'กองพัฒนาโครงการ',
  openIssues: 3,
  highRisks: 1,
  currentMilestone: 3,
  totalMilestones: 5,
  currentLifecycleStage: 'construction',
  lifecycleStageHistory: [
    { stage: 'planning', enteredAt: '2026-01-05T00:00:00.000Z', enteredBy: null, artifactDocIds: [] },
    { stage: 'procurement', enteredAt: '2026-01-20T00:00:00.000Z', enteredBy: 'user-001', artifactDocIds: ['doc-1'] },
    { stage: 'construction', enteredAt: '2026-02-10T00:00:00.000Z', enteredBy: 'user-001', artifactDocIds: ['doc-2'] },
  ],
};

const ganttTasks: GanttTask[] = [
  // Already-delayed task (end < eval, not complete)
  {
    id: 1,
    text: 'งานฐานราก',
    start_date: '2026-03-01',
    end_date: '2026-04-30',
    duration: 60,
    progress: 0.7,
    parent: 0,
    type: 'task',
    owner: 'นายกิตติ',
  },
  // On-schedule future task
  {
    id: 2,
    text: 'งานหลังคา',
    start_date: '2026-06-01',
    end_date: '2026-06-30',
    duration: 30,
    progress: 0,
    parent: 0,
    type: 'task',
    owner: 'นายกิตติ',
  },
  // A milestone, must be excluded
  {
    id: 3,
    text: 'Milestone 1',
    start_date: '2026-02-01',
    end_date: '2026-02-01',
    duration: 0,
    progress: 1,
    parent: 0,
    type: 'milestone',
    owner: '-',
  },
];

describe('buildDelayReport', () => {
  it('returns deterministic snapshot for a delayed outsourced project', () => {
    const report = buildDelayReport({
      project,
      ganttTasks,
      lifecycleHistory: project.lifecycleStageHistory,
      evaluationDate: FIXED_EVAL_DATE,
      engineerName: 'นายกิตติ คงเจริญ',
      generatedAt: FIXED_GENERATED_AT,
    });
    expect(report).toMatchSnapshot();
  });

  it('excludes milestones from the watch/delayed activities list', () => {
    const report = buildDelayReport({
      project,
      ganttTasks,
      lifecycleHistory: project.lifecycleStageHistory,
      evaluationDate: FIXED_EVAL_DATE,
      engineerName: null,
      generatedAt: FIXED_GENERATED_AT,
    });
    const section = report.sections.find((s) =>
      s.heading.includes('Watch / Delayed'),
    )!;
    section.rows.forEach((row) => {
      expect(row.label).not.toContain('Milestone');
    });
  });

  it('emits placeholder row when no watch/delayed tasks exist', () => {
    const onlyFuture: GanttTask[] = [ganttTasks[1]];
    const report = buildDelayReport({
      project,
      ganttTasks: onlyFuture,
      lifecycleHistory: project.lifecycleStageHistory,
      evaluationDate: FIXED_EVAL_DATE,
      engineerName: null,
      generatedAt: FIXED_GENERATED_AT,
    });
    const section = report.sections.find((s) =>
      s.heading.includes('Watch / Delayed'),
    )!;
    expect(section.rows).toHaveLength(1);
    expect(section.rows[0].value).toBe('—');
  });

  it('caps lifecycle history excerpt to the most-recent 3 entries', () => {
    const longHistory = [
      ...project.lifecycleStageHistory,
      { stage: 'handover' as const, enteredAt: '2026-05-01T00:00:00.000Z', enteredBy: 'user-001', artifactDocIds: [] },
      { stage: 'om' as const, enteredAt: '2026-05-10T00:00:00.000Z', enteredBy: 'user-001', artifactDocIds: [] },
    ];
    const report = buildDelayReport({
      project,
      ganttTasks,
      lifecycleHistory: longHistory,
      evaluationDate: FIXED_EVAL_DATE,
      engineerName: null,
      generatedAt: FIXED_GENERATED_AT,
    });
    const section = report.sections.find((s) =>
      s.heading.includes('Recent Lifecycle History'),
    )!;
    expect(section.rows).toHaveLength(3);
  });

  it('emits null periodStart and periodEnd (ad-hoc reports have no window)', () => {
    const report = buildDelayReport({
      project,
      ganttTasks,
      lifecycleHistory: project.lifecycleStageHistory,
      evaluationDate: FIXED_EVAL_DATE,
      engineerName: null,
      generatedAt: FIXED_GENERATED_AT,
    });
    expect(report.periodStart).toBeNull();
    expect(report.periodEnd).toBeNull();
  });
});
