import { integer, pgTable, real, text } from 'drizzle-orm/pg-core';

export const risks = pgTable('risks', {
  id: text('id').primaryKey(),
  projectId: text('project_id').notNull(),
  title: text('title').notNull(),
  description: text('description').notNull(),
  likelihood: integer('likelihood').notNull(),
  impact: integer('impact').notNull(),
  score: real('score').notNull(),
  level: text('level').notNull(),
  status: text('status').notNull(),
  owner: text('owner').notNull(),
  dateIdentified: text('date_identified').notNull(),
  mitigation: text('mitigation').notNull(),
});

export type RiskRow = typeof risks.$inferSelect;
export type RiskInsert = typeof risks.$inferInsert;
