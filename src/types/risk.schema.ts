import { z } from 'zod';

/**
 * Zod schemas for risk + issue domain (`src/types/risk.ts`).
 *
 * Routes covered:
 * - POST `risks/[projectId]` → `createRiskRequestSchema`
 * - POST `issues/[projectId]` → `createIssueRequestSchema`
 * - PATCH `issues/[projectId]` → `updateIssueStatusRequestSchema`
 */

const riskStatusSchema = z.enum(['open', 'mitigating', 'closed', 'accepted']);

export const createRiskRequestSchema = z
  .object({
    title: z.string().min(1, 'title is required'),
    description: z.string().optional(),
    likelihood: z.number().int().min(1).max(5).optional(),
    impact: z.number().int().min(1).max(5).optional(),
    status: riskStatusSchema.optional(),
    owner: z.string().min(1, 'owner is required'),
    dateIdentified: z.string().optional(),
    mitigation: z.string().optional(),
  })
  .strict();

export type CreateRiskRequest = z.infer<typeof createRiskRequestSchema>;

const issueSeveritySchema = z.enum(['high', 'medium', 'low']);
const issueStatusSchema = z.enum(['open', 'in_progress', 'review', 'closed']);

export const createIssueRequestSchema = z
  .object({
    title: z.string().min(1, 'title is required'),
    assignee: z.string().min(1, 'assignee is required'),
    severity: issueSeveritySchema.optional(),
    status: issueStatusSchema.optional(),
    linkedWbs: z.string().optional(),
    slaHours: z.number().optional(),
    resolution: z.string().optional(),
    progress: z.number().optional(),
    tags: z.array(z.string()).optional(),
    createdAt: z.string().optional(),
  })
  .strict();

export type CreateIssueRequest = z.infer<typeof createIssueRequestSchema>;

export const updateIssueStatusRequestSchema = z
  .object({
    issueId: z.string().min(1, 'issueId is required'),
    status: issueStatusSchema,
  })
  .strict();

export type UpdateIssueStatusRequest = z.infer<
  typeof updateIssueStatusRequestSchema
>;

/**
 * PR-L — full-edit PATCH for issues (extends the existing status-only
 * PATCH). All editable fields are optional; the route validates that at
 * least one is provided. `issueId` is required to identify the target.
 */
export const updateIssueRequestSchema = z
  .object({
    id: z.string().min(1, 'id is required'),
    title: z.string().min(1).optional(),
    severity: issueSeveritySchema.optional(),
    status: issueStatusSchema.optional(),
    assignee: z.string().min(1).optional(),
    linkedWbs: z.string().optional(),
    slaHours: z.number().optional(),
    resolution: z.string().optional(),
    progress: z.number().optional(),
    tags: z.array(z.string()).optional(),
  })
  .strict();

export type UpdateIssueRequest = z.infer<typeof updateIssueRequestSchema>;

/** PR-L — DELETE body for risks + issues. */
export const deleteIssueRequestSchema = z
  .object({ id: z.string().min(1, 'id is required') })
  .strict();

export type DeleteIssueRequest = z.infer<typeof deleteIssueRequestSchema>;

/** PR-L — PATCH body for risks. */
export const updateRiskRequestSchema = z
  .object({
    id: z.string().min(1, 'id is required'),
    title: z.string().min(1).optional(),
    description: z.string().optional(),
    likelihood: z.number().int().min(1).max(5).optional(),
    impact: z.number().int().min(1).max(5).optional(),
    status: riskStatusSchema.optional(),
    owner: z.string().min(1).optional(),
    mitigation: z.string().optional(),
  })
  .strict();

export type UpdateRiskRequest = z.infer<typeof updateRiskRequestSchema>;

/** PR-L — DELETE body for risks. */
export const deleteRiskRequestSchema = z
  .object({ id: z.string().min(1, 'id is required') })
  .strict();

export type DeleteRiskRequest = z.infer<typeof deleteRiskRequestSchema>;
