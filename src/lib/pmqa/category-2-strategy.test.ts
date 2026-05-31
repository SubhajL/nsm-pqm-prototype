import { describe, expect, it } from 'vitest';

import { computeStrategyAlignment } from './category-2-strategy';
import type { Project } from '@/types/project';

function makeProject(overrides: Partial<Project> = {}): Project {
  return {
    id: overrides.id ?? 'p1',
    code: 'PJ-T-0001',
    name: 'ทดสอบ',
    nameEn: 'Test Project',
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
    managerName: 'Manager',
    departmentId: 'd1',
    departmentName: 'Dept',
    openIssues: 0,
    highRisks: 0,
    currentMilestone: 0,
    totalMilestones: 1,
    currentLifecycleStage: 'planning',
    lifecycleStageHistory: [
      {
        stage: 'planning',
        enteredAt: '2026-01-01T00:00:00.000Z',
        enteredBy: null,
        artifactDocIds: [],
      },
    ],
    ...overrides,
  };
}

describe('computeStrategyAlignment — category 2', () => {
  it('returns both alignment + portfolio_balance indicators', () => {
    const indicators = computeStrategyAlignment([makeProject()]);
    const keys = indicators.map((i) => i.key);
    expect(keys).toContain('strategy_alignment_percent');
    expect(keys).toContain('portfolio_balance');
    expect(indicators.every((i) => i.category === 'category_2_strategy')).toBe(true);
  });

  it('returns score=1 + value=0 for empty portfolio (no projects to align)', () => {
    const indicators = computeStrategyAlignment([]);
    indicators.forEach((indicator) => {
      expect(indicator.value).toBe(0);
      expect(indicator.score).toBe(1);
    });
  });

  it.each([
    { label: '100% aligned → score 5', count: 10, aligned: 10, expectedValue: 100, expectedScore: 5 },
    { label: '90% aligned → score 5', count: 10, aligned: 9, expectedValue: 90, expectedScore: 5 },
    { label: '80% aligned → score 4', count: 10, aligned: 8, expectedValue: 80, expectedScore: 4 },
    { label: '70% aligned → score 3', count: 10, aligned: 7, expectedValue: 70, expectedScore: 3 },
    { label: '60% aligned → score 2', count: 10, aligned: 6, expectedValue: 60, expectedScore: 2 },
    { label: '50% aligned → score 1', count: 10, aligned: 5, expectedValue: 50, expectedScore: 1 },
  ])('strategy_alignment_percent: $label', ({ count, aligned, expectedValue, expectedScore }) => {
    const projects: Project[] = Array.from({ length: count }, (_, i) =>
      makeProject({
        id: `p-${i}`,
        nameEn: i < aligned ? `Aligned ${i}` : '',
      }),
    );
    const indicator = computeStrategyAlignment(projects).find(
      (x) => x.key === 'strategy_alignment_percent',
    );
    expect(indicator).toBeDefined();
    expect(indicator!.value).toBeCloseTo(expectedValue, 5);
    expect(indicator!.score).toBe(expectedScore);
    expect(indicator!.unit).toBe('percent');
  });

  it('strategy_alignment_percent: blank nameEn counts as not aligned', () => {
    const projects: Project[] = [
      makeProject({ id: 'a', nameEn: '   ' }),
      makeProject({ id: 'b', nameEn: 'English Name' }),
    ];
    const indicator = computeStrategyAlignment(projects).find(
      (x) => x.key === 'strategy_alignment_percent',
    );
    // 1 of 2 is aligned
    expect(indicator!.value).toBe(50);
  });

  it.each([
    { label: 'all projects past planning → 100% balance score 5', stages: ['construction', 'handover', 'om'] as const, expectedValue: 100, expectedScore: 5 },
    { label: '0 past planning → score 1', stages: ['planning', 'planning'] as const, expectedValue: 0, expectedScore: 1 },
  ])('portfolio_balance: $label', ({ stages, expectedValue, expectedScore }) => {
    const projects = stages.map((stage, i) =>
      makeProject({ id: `p-${i}`, currentLifecycleStage: stage }),
    );
    const indicator = computeStrategyAlignment(projects).find((x) => x.key === 'portfolio_balance');
    expect(indicator).toBeDefined();
    expect(indicator!.value).toBeCloseTo(expectedValue, 5);
    expect(indicator!.score).toBe(expectedScore);
  });

  it('rationale strings are non-empty and Thai', () => {
    const indicators = computeStrategyAlignment([makeProject()]);
    indicators.forEach((i) => {
      expect(i.rationale.length).toBeGreaterThan(0);
      expect(/[฀-๿]/.test(i.rationale)).toBe(true);
    });
  });
});
