/**
 * PR-23 — `work_periods` (งวดงาน) table.
 *
 * Mirrors `WorkPeriod` in `src/types/work-period.ts`. `state` is a
 * Postgres enum so cross-table constraints (future) can reference it
 * cleanly; `deliverables` is stored as a JSONB array because the typical
 * payload is a short checklist (≤ 20 items) and querying individual
 * entries is not on the roadmap.
 *
 * No FK constraints are declared (matches PR-25 convention) — the demo
 * relies on application-level integrity and we want to avoid extra
 * ALTER TABLE migrations as related tables move around.
 */

import { integer, jsonb, numeric, pgTable, real, text } from 'drizzle-orm/pg-core';

import { workPeriodStateEnum } from './enums';

export const workPeriods = pgTable('work_periods', {
  id: text('id').primaryKey(),
  projectId: text('project_id').notNull(),
  milestoneId: text('milestone_id'),
  number: integer('number').notNull(),
  title: text('title').notNull(),
  deliverables: jsonb('deliverables').$type<string[]>().notNull(),
  plannedStartDate: text('planned_start_date').notNull(),
  plannedEndDate: text('planned_end_date').notNull(),
  amount: numeric('amount', { precision: 14, scale: 2, mode: 'number' }).notNull(),
  percentage: real('percentage').notNull(),
  state: workPeriodStateEnum('state').notNull(),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export type WorkPeriodRow = typeof workPeriods.$inferSelect;
export type WorkPeriodInsert = typeof workPeriods.$inferInsert;
