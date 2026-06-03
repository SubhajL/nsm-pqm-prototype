/**
 * Project evaluation (การประเมินโครงการ) — executive end-of-project scorecard.
 *
 * One canonical evaluation per project. The summary fields
 * (`overallScore`, `percentage`, `level`) are DERIVED from the category
 * scores by `deriveEvaluationSummary` and computed server-side — never
 * trusted from the wire.
 */

export interface EvaluationCategory {
  /** Thai category name. */
  name: string;
  /** English category name. */
  nameEn: string;
  /** Integer 1–5. */
  score: number;
  note: string;
}

export interface ProjectEvaluation {
  projectId: string;
  projectName: string;
  /** Mean category score, one decimal. Derived. */
  overallScore: number;
  /** Always 5 for the 5-point rubric. */
  maxScore: number;
  /** Bilingual band label, e.g. `ดีมาก (Very Good)`. Derived. */
  level: string;
  /** `overallScore / maxScore`, integer percent. Derived. */
  percentage: number;
  evaluatedBy: string;
  /** ISO 8601 (CE) date. */
  evaluatedAt: string;
  categories: EvaluationCategory[];
  recommendation: string;
  createdAt: string;
  updatedAt: string;
}

export const EVALUATION_MAX_SCORE = 5;

/**
 * The standard RID 5-category project rubric, used to seed a fresh
 * evaluation when a project has none yet. Scores default to mid-band (3);
 * the evaluator adjusts before saving.
 */
export const DEFAULT_EVALUATION_CATEGORIES: ReadonlyArray<EvaluationCategory> = [
  { name: 'ความสำเร็จตามเป้าหมาย', nameEn: 'Goal Achievement', score: 3, note: '' },
  { name: 'งบประมาณ', nameEn: 'Budget', score: 3, note: '' },
  { name: 'การบริหารความเสี่ยง', nameEn: 'Risk Management', score: 3, note: '' },
  { name: 'ความร่วมมือของทีมงาน', nameEn: 'Team Collaboration', score: 3, note: '' },
  { name: 'ปัญหาอุปสรรค', nameEn: 'Issues & Obstacles', score: 3, note: '' },
];

export interface EvaluationSummary {
  overallScore: number;
  percentage: number;
  level: string;
}

/**
 * Bilingual maturity bands keyed by the lowest percentage that qualifies,
 * highest-first. `deriveEvaluationSummary` walks these in order.
 */
const EVALUATION_BANDS: ReadonlyArray<{ min: number; level: string }> = [
  { min: 90, level: 'ดีเยี่ยม (Excellent)' },
  { min: 80, level: 'ดีมาก (Very Good)' },
  { min: 70, level: 'ดี (Good)' },
  { min: 60, level: 'พอใช้ (Fair)' },
  { min: 0, level: 'ต้องปรับปรุง (Needs Improvement)' },
];

/**
 * Compute the derived summary from category scores. Pure + deterministic.
 * Empty input yields a zero scorecard at the lowest band (the upsert
 * schema rejects empty writes, so this only guards display math).
 */
export function deriveEvaluationSummary(
  categories: ReadonlyArray<{ score: number }>,
  maxScore: number = EVALUATION_MAX_SCORE,
): EvaluationSummary {
  if (categories.length === 0) {
    return { overallScore: 0, percentage: 0, level: bandFor(0) };
  }
  const sum = categories.reduce((acc, c) => acc + c.score, 0);
  const mean = sum / categories.length;
  const overallScore = Math.round(mean * 10) / 10;
  const percentage = Math.round((mean / maxScore) * 100);
  return { overallScore, percentage, level: bandFor(percentage) };
}

function bandFor(percentage: number): string {
  return (EVALUATION_BANDS.find((b) => percentage >= b.min) ?? EVALUATION_BANDS[EVALUATION_BANDS.length - 1]).level;
}
