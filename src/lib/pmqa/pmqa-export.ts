/**
 * PMQA audit-friendly export — PR-28.
 *
 * Converts a `PmqaScore` into a flat row table suitable for the existing
 * `ExportDocument` pipeline (PDF + Excel via `src/lib/export-utils.ts`).
 *
 * Row order follows ก.พ.ร. audit convention: category 2 → 6 → 7, then by
 * indicator key within category. Numeric values are formatted per unit
 * with a fixed decimal contract so the output is bit-stable for diffing
 * one quarter's audit binder against the next.
 */

import { PMQA_CATEGORY_LABELS, type PmqaIndicator, type PmqaScore } from './pmqa-types';

export interface ExportRow {
  category: string;
  indicatorKey: string;
  label: string;
  /** Pre-formatted value, including unit suffix where applicable. */
  value: string;
  score: number;
  /** Pre-formatted benchmark, or "—" when the indicator has no benchmark. */
  benchmark: string;
}

const CATEGORY_ORDER: PmqaIndicator['category'][] = [
  'category_2_strategy',
  'category_6_process',
  'category_7_results',
];

function formatValue(indicator: Pick<PmqaIndicator, 'value' | 'unit'>): string {
  switch (indicator.unit) {
    case 'percent':
      return `${indicator.value.toFixed(1)}%`;
    case 'ratio':
      return indicator.value.toFixed(2);
    case 'days':
      return `${indicator.value.toFixed(0)} วัน`;
    case 'count':
    default:
      return `${Math.round(indicator.value)}`;
  }
}

function formatBenchmark(indicator: PmqaIndicator): string {
  if (indicator.benchmark === undefined) return '—';
  return formatValue({ value: indicator.benchmark, unit: indicator.unit });
}

function categoryLabel(category: PmqaIndicator['category']): string {
  const { th, en } = PMQA_CATEGORY_LABELS[category];
  return `${th} (${en})`;
}

export function toExportRows(score: PmqaScore): ExportRow[] {
  const sorted = [...score.indicators].sort((a, b) => {
    const aIdx = CATEGORY_ORDER.indexOf(a.category);
    const bIdx = CATEGORY_ORDER.indexOf(b.category);
    if (aIdx !== bIdx) return aIdx - bIdx;
    return a.key.localeCompare(b.key);
  });

  return sorted.map((indicator) => ({
    category: categoryLabel(indicator.category),
    indicatorKey: indicator.key,
    label: indicator.label,
    value: formatValue(indicator),
    score: indicator.score,
    benchmark: formatBenchmark(indicator),
  }));
}
