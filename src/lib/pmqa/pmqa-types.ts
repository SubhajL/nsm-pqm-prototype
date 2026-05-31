/**
 * PMQA (Public Management Quality Award) types — PR-28.
 *
 * The Thai government's OPDC framework rates public agencies on six categories
 * (1 Leadership, 2 Strategy, 3 Customer, 4 Measurement, 5 Workforce, 6 Process,
 * 7 Results). PR-28 ships categories most relevant to project management:
 *
 *   - Category 2 (Strategy)  — strategy-to-project alignment
 *   - Category 6 (Process)   — process maturity / on-time stage transitions
 *   - Category 7 (Results)   — on-time%, on-budget%, quality-gate pass rate
 *
 * Categories 1, 3, 4, 5 are deferred post-MVP. All indicators map to a 1–5
 * maturity score using the bands documented per indicator in
 * `category-*-*.ts`. The roll-up score is the mean of category averages.
 *
 * This module is **pure** (no IO). Computation modules consume the existing
 * project / EVM / quality-gate / inspection types so PR-28 introduces no new
 * persistence.
 */

export type PmqaCategory =
  | 'category_2_strategy'
  | 'category_6_process'
  | 'category_7_results';

export const PMQA_CATEGORY_LABELS: Record<PmqaCategory, { th: string; en: string }> = {
  category_2_strategy: { th: 'การวางแผนเชิงยุทธศาสตร์', en: 'Strategic Planning' },
  category_6_process: { th: 'การจัดการกระบวนการ', en: 'Process Management' },
  category_7_results: { th: 'ผลลัพธ์การดำเนินการ', en: 'Results' },
};

export type PmqaIndicatorUnit = 'percent' | 'count' | 'ratio' | 'days';

export type PmqaMaturityScore = 1 | 2 | 3 | 4 | 5;

export interface PmqaIndicator {
  /** Stable machine identifier, e.g. `on_time_percent`. */
  key: string;
  category: PmqaCategory;
  /** Bilingual label, format `Thai (English)`. */
  label: string;
  /** Raw measurement (e.g. 87.3 for 87.3 %). */
  value: number;
  unit: PmqaIndicatorUnit;
  /** PMQA 1–5 maturity score derived from `value` via the indicator's band. */
  score: PmqaMaturityScore;
  /** Optional industry / sector target the indicator is compared against. */
  benchmark?: number;
  /** Brief Thai-first explanation of how the score was reached. */
  rationale: string;
}

export type PmqaScoreScope = 'portfolio' | 'project';

export interface PmqaScore {
  /** ISO timestamp when the roll-up was computed. */
  generatedAt: string;
  scope: PmqaScoreScope;
  /** Project id when `scope === 'project'`. */
  scopeId?: string;
  indicators: PmqaIndicator[];
  /** Mean PMQA score per category. Values are in the closed interval [1, 5]. */
  categoryAverages: Record<PmqaCategory, number>;
  /** Mean of category averages. */
  overallScore: number;
}
