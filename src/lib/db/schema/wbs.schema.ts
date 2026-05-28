import { boolean, integer, pgTable, real, text } from 'drizzle-orm/pg-core';

import { projects } from './project.schema';

/**
 * WBS nodes. `parentId` references another WBS node (nullable for root nodes).
 * No FK on parentId — keeping it nullable + un-constrained avoids ordering
 * problems during bulk inserts; integrity is enforced by the seed/backfill
 * script.
 */
export const wbsNodes = pgTable('wbs_nodes', {
  id: text('id').primaryKey(),
  projectId: text('project_id')
    .notNull()
    .references(() => projects.id, { onDelete: 'cascade' }),
  parentId: text('parent_id'),
  code: text('code').notNull(),
  name: text('name').notNull(),
  weight: real('weight').notNull(),
  progress: real('progress').notNull(),
  level: integer('level').notNull(),
  hasBOQ: boolean('has_boq').notNull(),
});

export type WbsRow = typeof wbsNodes.$inferSelect;
export type WbsInsert = typeof wbsNodes.$inferInsert;
