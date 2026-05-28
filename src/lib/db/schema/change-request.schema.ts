import { jsonb, pgTable, real, text } from 'drizzle-orm/pg-core';

import type { CRWorkflowStep } from '@/types/document';

export const changeRequests = pgTable('change_requests', {
  id: text('id').primaryKey(),
  projectId: text('project_id').notNull(),
  title: text('title').notNull(),
  reason: text('reason').notNull(),
  budgetImpact: real('budget_impact').notNull(),
  scheduleImpact: real('schedule_impact').notNull(),
  linkedWbs: text('linked_wbs').notNull(),
  priority: text('priority').notNull(),
  status: text('status').notNull(),
  requestedBy: text('requested_by').notNull(),
  requestedAt: text('requested_at').notNull(),
  approvedBy: text('approved_by'),
  approvedAt: text('approved_at'),
  attachments: jsonb('attachments').$type<string[]>().notNull().default([]),
  workflow: jsonb('workflow').$type<CRWorkflowStep[]>().notNull().default([]),
});

export type ChangeRequestRow = typeof changeRequests.$inferSelect;
export type ChangeRequestInsert = typeof changeRequests.$inferInsert;
