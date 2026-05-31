import { describe, expect, it } from 'vitest';

import { rollupAllCategories } from './pmqa-rollup';
import type { Project } from '@/types/project';
import type { QualityGate, InspectionRecord, ITPItem } from '@/types/quality';

function makeProject(overrides: Partial<Project> = {}): Project {
  return {
    id: overrides.id ?? 'p1',
    code: 'PJ-T',
    name: 'ทดสอบ',
    nameEn: 'Test',
    projectClass: 'construction',
    deliveryMethod: 'in_house',
    contractingModel: null,
    sizeTier: 'medium',
    status: 'in_progress',
    budget: 1_000_000,
    progress: 0.5,
    scheduleHealth: 'on_schedule',
    startDate: '2026-01-01',
    endDate: '2026-12-31',
    duration: 365,
    spiValue: 1,
    cpiValue: 1,
    managerId: 'u1',
    managerName: 'M',
    departmentId: 'd1',
    departmentName: 'D',
    openIssues: 0,
    highRisks: 0,
    currentMilestone: 0,
    totalMilestones: 1,
    currentLifecycleStage: 'construction',
    lifecycleStageHistory: [
      { stage: 'planning', enteredAt: '2026-01-01T00:00:00.000Z', enteredBy: null, artifactDocIds: [] },
      { stage: 'construction', enteredAt: '2026-01-20T00:00:00.000Z', enteredBy: null, artifactDocIds: [] },
    ],
    ...overrides,
  };
}

const gates: QualityGate[] = [
  { id: 'g-1', projectId: 'p1', number: 0, name: 'a', nameEn: 'a', status: 'passed', date: '2026-01-15' },
];

const itps: ITPItem[] = [
  { id: 'itp-1', projectId: 'p1', sequence: 1, item: 'i', standard: 's', inspectionType: 'H', inspector: 'x', status: 'pending' },
];

const inspections: InspectionRecord[] = [
  {
    id: 'insp-1',
    projectId: 'p1',
    itpId: 'itp-1',
    title: 't',
    date: '2026-02-01',
    time: '10:00',
    inspectors: ['A'],
    wbsLink: 'WBS-1',
    standards: [],
    checklist: [],
    overallResult: 'pass',
    failReason: '',
    autoNCR: false,
    workflowStatus: 'draft',
  },
];

describe('rollupAllCategories', () => {
  it('produces a PmqaScore with all 3 category averages', () => {
    const score = rollupAllCategories({
      projects: [makeProject()],
      qualityGates: gates,
      itpItems: itps,
      inspections,
      scope: 'portfolio',
    });
    expect(score.scope).toBe('portfolio');
    expect(score.scopeId).toBeUndefined();
    expect(score.indicators.length).toBeGreaterThanOrEqual(8); // 2 + 3 + 3
    expect(score.categoryAverages.category_2_strategy).toBeGreaterThan(0);
    expect(score.categoryAverages.category_6_process).toBeGreaterThan(0);
    expect(score.categoryAverages.category_7_results).toBeGreaterThan(0);
  });

  it('overall score is the mean of category averages', () => {
    const score = rollupAllCategories({
      projects: [makeProject()],
      qualityGates: gates,
      itpItems: itps,
      inspections,
      scope: 'portfolio',
    });
    const avg =
      (score.categoryAverages.category_2_strategy +
        score.categoryAverages.category_6_process +
        score.categoryAverages.category_7_results) /
      3;
    expect(score.overallScore).toBeCloseTo(avg, 5);
  });

  it('project scope filters by scopeId', () => {
    const projects = [makeProject({ id: 'p1' }), makeProject({ id: 'p2', scheduleHealth: 'delayed', cpiValue: 0.5 })];
    const portfolio = rollupAllCategories({
      projects,
      qualityGates: gates,
      itpItems: itps,
      inspections,
      scope: 'portfolio',
    });
    const proj = rollupAllCategories({
      projects,
      qualityGates: gates,
      itpItems: itps,
      inspections,
      scope: 'project',
      scopeId: 'p1',
    });
    expect(proj.scope).toBe('project');
    expect(proj.scopeId).toBe('p1');
    // p1 alone has better metrics than the portfolio of p1+p2
    expect(proj.overallScore).toBeGreaterThanOrEqual(portfolio.overallScore);
  });

  it('empty portfolio produces a score where every indicator is 1', () => {
    const score = rollupAllCategories({
      projects: [],
      qualityGates: [],
      itpItems: [],
      inspections: [],
      scope: 'portfolio',
    });
    expect(score.overallScore).toBe(1);
    expect(score.categoryAverages.category_2_strategy).toBe(1);
    expect(score.categoryAverages.category_6_process).toBe(1);
    expect(score.categoryAverages.category_7_results).toBe(1);
  });

  it('generatedAt is a valid ISO timestamp', () => {
    const score = rollupAllCategories({
      projects: [makeProject()],
      qualityGates: gates,
      itpItems: itps,
      inspections,
      scope: 'portfolio',
    });
    expect(() => new Date(score.generatedAt).toISOString()).not.toThrow();
    expect(score.generatedAt).toBe(new Date(score.generatedAt).toISOString());
  });

  it('all category averages are clamped to [1, 5]', () => {
    const score = rollupAllCategories({
      projects: [makeProject()],
      qualityGates: gates,
      itpItems: itps,
      inspections,
      scope: 'portfolio',
    });
    Object.values(score.categoryAverages).forEach((avg) => {
      expect(avg).toBeGreaterThanOrEqual(1);
      expect(avg).toBeLessThanOrEqual(5);
    });
    expect(score.overallScore).toBeGreaterThanOrEqual(1);
    expect(score.overallScore).toBeLessThanOrEqual(5);
  });
});
