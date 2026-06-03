/**
 * Zod schema for the Project Evaluation upsert API.
 *
 * The request carries ONLY the human-authored fields. The server derives
 * `overallScore` / `percentage` / `level` via `deriveEvaluationSummary`
 * and sets `maxScore` — so `.strict()` here rejects any client attempt to
 * smuggle a derived/forged summary.
 */

import { z } from 'zod';

const evaluationCategorySchema = z
  .object({
    name: z.string().trim().min(1, 'name is required'),
    nameEn: z.string().trim().min(1, 'nameEn is required'),
    score: z
      .number()
      .int('score must be an integer')
      .min(1, 'score must be ≥ 1')
      .max(5, 'score must be ≤ 5'),
    note: z.string().default(''),
  })
  .strict();

// `projectName` is intentionally NOT accepted from the wire — the route
// derives it from the fetched project so an evaluation can't claim a name
// unrelated to its project. `.trim()` runs before `.min(1)` so a
// whitespace-only value is rejected, not silently persisted as empty.
export const upsertEvaluationRequestSchema = z
  .object({
    evaluatedBy: z.string().trim().min(1, 'evaluatedBy is required'),
    evaluatedAt: z.string().trim().min(1, 'evaluatedAt is required'),
    categories: z
      .array(evaluationCategorySchema)
      .min(1, 'at least one category is required'),
    recommendation: z.string().default(''),
  })
  .strict();

export type UpsertEvaluationRequest = z.infer<typeof upsertEvaluationRequestSchema>;
