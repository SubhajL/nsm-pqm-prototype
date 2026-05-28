import { integer, pgTable, real, text } from 'drizzle-orm/pg-core';

/**
 * Project milestones. `projectId` kept as a plain text column without FK
 * so contract tests can create milestones for synthetic project ids that
 * never reach the projects table.
 */
export const milestones = pgTable('milestones', {
  id: text('id').primaryKey(),
  projectId: text('project_id').notNull(),
  number: integer('number').notNull(),
  name: text('name').notNull(),
  dueDate: text('due_date').notNull(),
  amount: real('amount').notNull(),
  percentage: real('percentage').notNull(),
  deliverables: text('deliverables').notNull(),
  status: text('status').notNull(),
});

export type MilestoneRow = typeof milestones.$inferSelect;
export type MilestoneInsert = typeof milestones.$inferInsert;
