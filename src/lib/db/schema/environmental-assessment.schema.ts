import { pgTable, text } from 'drizzle-orm/pg-core';

import { eiaStatusEnum } from './enums';

export const environmentalAssessments = pgTable('environmental_assessments', {
  id: text('id').primaryKey(),
  projectId: text('project_id').notNull(),
  kind: text('kind').notNull(),
  status: eiaStatusEnum('status').notNull(),
  approvedAt: text('approved_at'),
  approvalReference: text('approval_reference'),
  notes: text('notes').notNull(),
});

export type EnvironmentalAssessmentRow =
  typeof environmentalAssessments.$inferSelect;
export type EnvironmentalAssessmentInsert =
  typeof environmentalAssessments.$inferInsert;
