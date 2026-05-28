import { integer, jsonb, pgTable, real, text } from 'drizzle-orm/pg-core';

export const issues = pgTable('issues', {
  id: text('id').primaryKey(),
  projectId: text('project_id').notNull(),
  title: text('title').notNull(),
  severity: text('severity').notNull(),
  status: text('status').notNull(),
  assignee: text('assignee').notNull(),
  linkedWbs: text('linked_wbs').notNull(),
  slaHours: integer('sla_hours').notNull(),
  resolution: text('resolution'),
  progress: real('progress'),
  tags: jsonb('tags').$type<string[]>().default([]),
  sourceInspectionId: text('source_inspection_id'),
  sourceRiskId: text('source_risk_id'),
  sourceType: text('source_type'),
  createdAt: text('created_at').notNull(),
  closedAt: text('closed_at'),
});

export type IssueRow = typeof issues.$inferSelect;
export type IssueInsert = typeof issues.$inferInsert;
