/**
 * PMQA roll-up — PR-28.
 *
 * Combines the three category computations into a single `PmqaScore` for
 * either the full portfolio or a single project. The roll-up rule is:
 *
 *   categoryAverage = mean of all indicator.score values within the category
 *   overallScore    = mean of categoryAverage values across the 3 categories
 *
 * Both means are clamped to [1, 5] to keep the contract strict (the inputs
 * are already 1-5 integers per indicator, but the clamp guards against any
 * future indicator that returns out-of-band values).
 */

import type { Project } from '@/types/project';
import type { InspectionRecord, ITPItem, QualityGate } from '@/types/quality';
import { computeStrategyAlignment } from './category-2-strategy';
import { computeProcessMaturity } from './category-6-process';
import { computeResults } from './category-7-results';
import type { PmqaCategory, PmqaIndicator, PmqaScore, PmqaScoreScope } from './pmqa-types';

export interface RollupInput {
  projects: Project[];
  qualityGates: QualityGate[];
  itpItems: ITPItem[];
  inspections: InspectionRecord[];
  scope: PmqaScoreScope;
  /** Required when `scope === 'project'`. */
  scopeId?: string;
}

function clampScore(value: number): number {
  if (!Number.isFinite(value)) return 1;
  if (value < 1) return 1;
  if (value > 5) return 5;
  return value;
}

function averageScores(indicators: PmqaIndicator[]): number {
  if (indicators.length === 0) return 1;
  const sum = indicators.reduce((acc, i) => acc + i.score, 0);
  return clampScore(sum / indicators.length);
}

function indicatorsForCategory(
  indicators: PmqaIndicator[],
  category: PmqaCategory,
): PmqaIndicator[] {
  return indicators.filter((i) => i.category === category);
}

function scopedSubset(input: RollupInput) {
  if (input.scope !== 'project' || !input.scopeId) {
    return {
      projects: input.projects,
      qualityGates: input.qualityGates,
      itpItems: input.itpItems,
      inspections: input.inspections,
    };
  }
  const id = input.scopeId;
  return {
    projects: input.projects.filter((p) => p.id === id),
    qualityGates: input.qualityGates.filter((g) => g.projectId === id),
    itpItems: input.itpItems.filter((it) => it.projectId === id),
    inspections: input.inspections.filter((ins) => ins.projectId === id),
  };
}

export function rollupAllCategories(input: RollupInput): PmqaScore {
  const subset = scopedSubset(input);

  const indicators: PmqaIndicator[] = [
    ...computeStrategyAlignment(subset.projects),
    ...computeProcessMaturity(subset.projects, subset.qualityGates),
    ...computeResults(subset.projects, subset.itpItems, subset.inspections),
  ];

  const categoryAverages: Record<PmqaCategory, number> = {
    category_2_strategy: averageScores(indicatorsForCategory(indicators, 'category_2_strategy')),
    category_6_process: averageScores(indicatorsForCategory(indicators, 'category_6_process')),
    category_7_results: averageScores(indicatorsForCategory(indicators, 'category_7_results')),
  };

  const overallScore = clampScore(
    (categoryAverages.category_2_strategy +
      categoryAverages.category_6_process +
      categoryAverages.category_7_results) /
      3,
  );

  return {
    generatedAt: new Date().toISOString(),
    scope: input.scope,
    scopeId: input.scope === 'project' ? input.scopeId : undefined,
    indicators,
    categoryAverages,
    overallScore,
  };
}
