/**
 * `project_evaluations` — one canonical executive scorecard per project.
 *
 * Mirrors `ProjectEvaluation` in `src/types/evaluation.ts`. `project_id`
 * is the primary key (1:1 with the project). `categories` is jsonb; the
 * summary columns (`overall_score` / `percentage` / `level`) are derived
 * server-side and persisted for read convenience.
 */

import { integer, jsonb, pgTable, real, text } from 'drizzle-orm/pg-core';

import type { EvaluationCategory } from '@/types/evaluation';

export const projectEvaluations = pgTable('project_evaluations', {
  projectId: text('project_id').primaryKey(),
  projectName: text('project_name').notNull(),
  overallScore: real('overall_score').notNull(),
  maxScore: integer('max_score').notNull(),
  level: text('level').notNull(),
  percentage: integer('percentage').notNull(),
  evaluatedBy: text('evaluated_by').notNull(),
  evaluatedAt: text('evaluated_at').notNull(),
  categories: jsonb('categories').$type<EvaluationCategory[]>().notNull(),
  recommendation: text('recommendation').notNull(),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export type ProjectEvaluationRow = typeof projectEvaluations.$inferSelect;
export type ProjectEvaluationInsert = typeof projectEvaluations.$inferInsert;
