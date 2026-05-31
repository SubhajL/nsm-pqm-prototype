import { describe, expect, it } from 'vitest';

import { computeResults } from './category-7-results';
import type { Project } from '@/types/project';
import type { InspectionRecord, ITPItem } from '@/types/quality';

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
    currentLifecycleStage: 'planning',
    lifecycleStageHistory: [
      { stage: 'planning', enteredAt: '2026-01-01T00:00:00.000Z', enteredBy: null, artifactDocIds: [] },
    ],
    ...overrides,
  };
}

function makeItp(overrides: Partial<ITPItem> = {}): ITPItem {
  return {
    id: overrides.id ?? 'itp-1',
    projectId: overrides.projectId ?? 'p1',
    sequence: 1,
    item: 'รายการ',
    standard: 'STD',
    inspectionType: 'H',
    inspector: 'ผู้ตรวจ',
    status: 'pending',
    ...overrides,
  };
}

function makeInspection(overrides: Partial<InspectionRecord> = {}): InspectionRecord {
  return {
    id: overrides.id ?? 'insp-1',
    projectId: overrides.projectId ?? 'p1',
    itpId: overrides.itpId ?? 'itp-1',
    title: 'ตรวจ',
    date: '2026-02-01',
    time: '10:00',
    inspectors: ['A'],
    wbsLink: 'WBS-1',
    standards: ['STD'],
    checklist: [],
    overallResult: 'pass',
    failReason: '',
    autoNCR: false,
    workflowStatus: 'draft',
    ...overrides,
  };
}

describe('computeResults — category 7', () => {
  it('returns on_time_percent + on_budget_percent + inspection_completion_rate', () => {
    const indicators = computeResults([makeProject()], [makeItp()], [makeInspection()]);
    const keys = indicators.map((i) => i.key);
    expect(keys).toContain('on_time_percent');
    expect(keys).toContain('on_budget_percent');
    expect(keys).toContain('inspection_completion_rate');
    expect(indicators.every((i) => i.category === 'category_7_results')).toBe(true);
  });

  it('empty inputs → all indicators value 0, score 1', () => {
    const indicators = computeResults([], [], []);
    indicators.forEach((i) => {
      expect(i.value).toBe(0);
      expect(i.score).toBe(1);
    });
  });

  it.each([
    { label: '100% on schedule → score 5', healths: ['on_schedule', 'on_schedule'] as const, expected: 100, score: 5 },
    { label: '50% on schedule → score 1', healths: ['on_schedule', 'delayed'] as const, expected: 50, score: 1 },
    { label: '80% on schedule → score 4', healths: ['on_schedule', 'on_schedule', 'on_schedule', 'on_schedule', 'watch'] as const, expected: 80, score: 4 },
  ])('on_time_percent: $label', ({ healths, expected, score }) => {
    const projects = healths.map((h, i) =>
      makeProject({ id: `p-${i}`, scheduleHealth: h as Project['scheduleHealth'] }),
    );
    const indicator = computeResults(projects, [], []).find((x) => x.key === 'on_time_percent')!;
    expect(indicator.value).toBeCloseTo(expected, 1);
    expect(indicator.score).toBe(score);
  });

  it.each([
    { label: 'all CPI ≥ 0.95 → 100% → score 5', cpis: [0.95, 1.0, 1.2], expected: 100, score: 5 },
    { label: 'half on budget → score 1', cpis: [0.9, 1.0], expected: 50, score: 1 },
    { label: '0.949 is just below threshold', cpis: [0.949, 1.0], expected: 50, score: 1 },
  ])('on_budget_percent: $label', ({ cpis, expected, score }) => {
    const projects = cpis.map((cpi, i) => makeProject({ id: `p-${i}`, cpiValue: cpi }));
    const indicator = computeResults(projects, [], []).find((x) => x.key === 'on_budget_percent')!;
    expect(indicator.value).toBeCloseTo(expected, 1);
    expect(indicator.score).toBe(score);
  });

  it.each([
    {
      label: 'every ITP has ≥1 inspection → 100% → score 5',
      itpIds: ['itp-1', 'itp-2'],
      inspectionItpIds: ['itp-1', 'itp-2'],
      expected: 100,
      score: 5,
    },
    {
      label: 'half have inspections → score 1',
      itpIds: ['itp-1', 'itp-2'],
      inspectionItpIds: ['itp-1'],
      expected: 50,
      score: 1,
    },
    {
      label: 'no ITPs → 0% → score 1',
      itpIds: [] as string[],
      inspectionItpIds: [] as string[],
      expected: 0,
      score: 1,
    },
  ])('inspection_completion_rate: $label', ({ itpIds, inspectionItpIds, expected, score }) => {
    const itps = itpIds.map((id) => makeItp({ id }));
    const inspections = inspectionItpIds.map((itpId, i) =>
      makeInspection({ id: `insp-${i}`, itpId }),
    );
    const indicator = computeResults([makeProject()], itps, inspections).find(
      (x) => x.key === 'inspection_completion_rate',
    )!;
    expect(indicator.value).toBeCloseTo(expected, 1);
    expect(indicator.score).toBe(score);
  });
});
