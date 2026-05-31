/**
 * PR-27 — Project approval workflow table.
 *
 * Backs the per-project approval gate the existing `approval/page.tsx`
 * UI displays (currently UI-only with no API). Each row tracks one
 * approval submission for one project; multiple rows per project are
 * allowed when a previously rejected/withdrawn submission is resubmitted.
 *
 * `decision_history` is a JSONB column holding `ApprovalDecision[]`
 * (append-only — every state transition tacks on a new entry).
 */
import { jsonb, pgTable, text } from 'drizzle-orm/pg-core';

import type { ApprovalDecision } from '@/types/project-approval-request';

import { approvalRequestStateEnum } from './enums';

export const projectApprovalRequests = pgTable('project_approval_requests', {
  id: text('id').primaryKey(),
  projectId: text('project_id').notNull(),
  submittedBy: text('submitted_by').notNull(),
  submittedAt: text('submitted_at').notNull(),
  state: approvalRequestStateEnum('state').notNull(),
  currentApproverRole: text('current_approver_role'),
  decisionHistory: jsonb('decision_history')
    .$type<ApprovalDecision[]>()
    .notNull()
    .default([]),
  notes: text('notes').notNull().default(''),
});

export type ProjectApprovalRequestRow =
  typeof projectApprovalRequests.$inferSelect;
export type ProjectApprovalRequestInsert =
  typeof projectApprovalRequests.$inferInsert;
