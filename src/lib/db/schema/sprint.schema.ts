/**
 * PR-30a — `it_sprints` (Hybrid-Agile sprints nested in lifecycle stage).
 *
 * Mirrors `ItSprint` in `src/types/sprint.ts`. `lifecycle_stage` is plain
 * text (no enum) to avoid coupling to the `rid_lifecycle_stage` type —
 * keeps the table portable if the lifecycle vocabulary moves.
 */

import { integer, pgTable, real, text } from 'drizzle-orm/pg-core';

export const itSprints = pgTable('it_sprints', {
  id: text('id').primaryKey(),
  projectId: text('project_id').notNull(),
  lifecycleStage: text('lifecycle_stage').notNull(),
  sprintNumber: integer('sprint_number').notNull(),
  startDate: text('start_date').notNull(),
  endDate: text('end_date').notNull(),
  goal: text('goal').notNull(),
  velocityPoints: real('velocity_points').notNull(),
  completedPoints: real('completed_points').notNull(),
  notes: text('notes').notNull(),
});

export type ItSprintRow = typeof itSprints.$inferSelect;
export type ItSprintInsert = typeof itSprints.$inferInsert;
