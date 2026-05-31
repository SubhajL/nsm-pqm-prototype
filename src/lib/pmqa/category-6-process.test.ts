import { describe, expect, it } from 'vitest';

import { computeProcessMaturity } from './category-6-process';
import type { Project, LifecycleStageHistoryEntry } from '@/types/project';
import type { QualityGate } from '@/types/quality';
import type { RidLifecycleStage } from '@/types/rid/vocabulary';

function makeHistory(entries: Array<{ stage: RidLifecycleStage; daysAfterStart: number }>): LifecycleStageHistoryEntry[] {
  const base = new Date('2026-01-01T00:00:00.000Z').getTime();
  return entries.map(({ stage, daysAfterStart }) => ({
    stage,
    enteredAt: new Date(base + daysAfterStart * 24 * 60 * 60 * 1000).toISOString(),
    enteredBy: null,
    artifactDocIds: [],
  }));
}

function makeProject(overrides: Partial<Project> = {}): Project {
  const lifecycleStageHistory =
    overrides.lifecycleStageHistory ?? makeHistory([{ stage: 'planning', daysAfterStart: 0 }]);
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
    currentLifecycleStage: lifecycleStageHistory[lifecycleStageHistory.length - 1]!.stage,
    lifecycleStageHistory,
    ...overrides,
  };
}

function makeGate(overrides: Partial<QualityGate> = {}): QualityGate {
  return {
    id: overrides.id ?? 'g1',
    projectId: overrides.projectId ?? 'p1',
    number: 0,
    name: 'Concept',
    nameEn: 'Concept',
    status: overrides.status ?? 'passed',
    date: '2026-01-15',
    ...overrides,
  };
}

describe('computeProcessMaturity — category 6', () => {
  it('returns lifecycle_stage_progression + on_time_stage_transitions_percent + quality_gate_pass_rate', () => {
    const indicators = computeProcessMaturity([makeProject()], [makeGate()]);
    const keys = indicators.map((i) => i.key);
    expect(keys).toContain('lifecycle_stage_progression');
    expect(keys).toContain('on_time_stage_transitions_percent');
    expect(keys).toContain('quality_gate_pass_rate');
    expect(indicators.every((i) => i.category === 'category_6_process')).toBe(true);
  });

  it.each([
    {
      label: 'empty inputs → score 1 across all indicators',
      projects: [] as Project[],
      gates: [] as QualityGate[],
      expected: { progression: 0, onTime: 0, passRate: 0, scores: [1, 1, 1] },
    },
  ])('$label', ({ projects, gates, expected }) => {
    const indicators = computeProcessMaturity(projects, gates);
    const progression = indicators.find((i) => i.key === 'lifecycle_stage_progression')!;
    const onTime = indicators.find((i) => i.key === 'on_time_stage_transitions_percent')!;
    const passRate = indicators.find((i) => i.key === 'quality_gate_pass_rate')!;
    expect(progression.value).toBe(expected.progression);
    expect(onTime.value).toBe(expected.onTime);
    expect(passRate.value).toBe(expected.passRate);
    expect([progression.score, onTime.score, passRate.score]).toEqual(expected.scores);
  });

  it('lifecycle_stage_progression: 1 stage transition over 1 quarter → 1.0 → score 5', () => {
    // 2 history entries (1 transition) for a project spanning ~90 days
    const project = makeProject({
      startDate: '2026-01-01',
      endDate: '2026-03-31',
      duration: 90,
      lifecycleStageHistory: makeHistory([
        { stage: 'planning', daysAfterStart: 0 },
        { stage: 'survey_design', daysAfterStart: 30 },
      ]),
    });
    const indicator = computeProcessMaturity([project], []).find(
      (x) => x.key === 'lifecycle_stage_progression',
    )!;
    expect(indicator.value).toBeCloseTo(1, 1);
    expect(indicator.score).toBe(5);
  });

  it('lifecycle_stage_progression: 0 transitions → score 1', () => {
    const project = makeProject({
      startDate: '2026-01-01',
      endDate: '2026-12-31',
      lifecycleStageHistory: makeHistory([{ stage: 'planning', daysAfterStart: 0 }]),
    });
    const indicator = computeProcessMaturity([project], []).find(
      (x) => x.key === 'lifecycle_stage_progression',
    )!;
    expect(indicator.value).toBe(0);
    expect(indicator.score).toBe(1);
  });

  it.each([
    {
      label: 'all transitions within 30 days → 100% on-time → score 5',
      gaps: [10, 20, 25],
      expected: 100,
      score: 5,
    },
    {
      label: '2/3 transitions within 30 days → 66.67% → score 2',
      gaps: [10, 20, 60],
      expected: 200 / 3,
      score: 2,
    },
    {
      label: '0% on-time → score 1',
      gaps: [60, 90],
      expected: 0,
      score: 1,
    },
  ])('on_time_stage_transitions_percent: $label', ({ gaps, expected, score }) => {
    let cum = 0;
    const stages: RidLifecycleStage[] = ['planning', 'survey_design', 'procurement', 'construction'];
    const entries: Array<{ stage: RidLifecycleStage; daysAfterStart: number }> = [
      { stage: 'planning', daysAfterStart: 0 },
    ];
    gaps.forEach((gap, idx) => {
      cum += gap;
      const stage: RidLifecycleStage = stages[idx + 1] ?? 'construction';
      entries.push({ stage, daysAfterStart: cum });
    });
    const history = makeHistory(entries);
    const project = makeProject({ lifecycleStageHistory: history });
    const indicator = computeProcessMaturity([project], []).find(
      (x) => x.key === 'on_time_stage_transitions_percent',
    )!;
    expect(indicator.value).toBeCloseTo(expected, 1);
    expect(indicator.score).toBe(score);
  });

  it.each([
    { label: '100% pass → score 5', statuses: ['passed', 'passed', 'passed'] as const, expected: 100, score: 5 },
    { label: '80% pass → score 4', statuses: ['passed', 'passed', 'passed', 'passed', 'conditional'] as const, expected: 80, score: 4 },
    { label: '60% pass → score 2', statuses: ['passed', 'passed', 'passed', 'conditional', 'pending'] as const, expected: 60, score: 2 },
    { label: '0 of 0 (no completed gates) → score 1', statuses: ['pending', 'pending'] as const, expected: 0, score: 1 },
  ])('quality_gate_pass_rate: $label', ({ statuses, expected, score }) => {
    const gates = statuses.map((status, i) =>
      makeGate({ id: `g-${i}`, status: status as QualityGate['status'] }),
    );
    const indicator = computeProcessMaturity([makeProject()], gates).find(
      (x) => x.key === 'quality_gate_pass_rate',
    )!;
    expect(indicator.value).toBeCloseTo(expected, 1);
    expect(indicator.score).toBe(score);
  });
});
