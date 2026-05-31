/**
 * PR-27 — Zod schemas for the project-approval workflow.
 *
 * Two write surfaces:
 *   - `POST /api/project-approval-requests/[projectId]` creates a new
 *     submission (state = 'submitted').
 *   - `POST /api/project-approval-requests/[id]/decision` records an
 *     approval decision that drives the state machine forward.
 */
import { z } from 'zod';

export const createProjectApprovalRequestSchema = z
  .object({
    notes: z.string().default(''),
  })
  .strict();

export type CreateProjectApprovalRequestBody = z.infer<
  typeof createProjectApprovalRequestSchema
>;

export const recordApprovalDecisionSchema = z
  .object({
    decision: z.enum(['approve', 'reject', 'request_changes']),
    comment: z.string().default(''),
  })
  .strict();

export type RecordApprovalDecisionBody = z.infer<
  typeof recordApprovalDecisionSchema
>;
