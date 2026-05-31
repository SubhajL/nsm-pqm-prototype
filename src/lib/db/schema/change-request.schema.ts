import { integer, jsonb, pgTable, real, text } from 'drizzle-orm/pg-core';

import type { CRWorkflowStep } from '@/types/document';

/**
 * Change requests table.
 *
 * PR-27 added the impact-analysis fields (`impact_*`), the approver
 * chain, and rejection/decision metadata. The pre-PR-27 columns are
 * unchanged so existing seed data (and the back-compat status values
 * `pending` / `approved`) keep working without backfill.
 *
 * Status column accepts the union from `src/types/document.ts:CRStatus`
 * (PR-27 granular workflow + legacy values). Stored as plain text rather
 * than a pgEnum to avoid breaking existing rows on every union
 * extension — the Zod schemas in `document.schema.ts` validate the
 * write path.
 */
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
  // PR-27 — impact analysis (delta to project schedule/budget/scope).
  impactScheduleDays: integer('impact_schedule_days').notNull().default(0),
  impactBudgetTHB: real('impact_budget_thb').notNull().default(0),
  impactScope: text('impact_scope').notNull().default(''),
  // PR-27 — append-only chain of user ids who approved at each tier.
  approvedByChain: jsonb('approved_by_chain')
    .$type<string[]>()
    .notNull()
    .default([]),
  rejectedReason: text('rejected_reason'),
  decidedAt: text('decided_at'),
});

export type ChangeRequestRow = typeof changeRequests.$inferSelect;
export type ChangeRequestInsert = typeof changeRequests.$inferInsert;
