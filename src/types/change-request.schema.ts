/**
 * PR-27 — Additional Zod schemas for the change-request workflow.
 *
 * Complements `document.schema.ts:createChangeRequestRequestSchema` and
 * `decideChangeRequestRequestSchema` with the per-CR PATCH and the
 * state-transition payload.
 */
import { z } from 'zod';

/** Granular CR statuses introduced by PR-27 (plus legacy values for back-compat). */
export const CHANGE_REQUEST_STATUS_VALUES = [
  'submitted',
  'under_review',
  'pm_approved',
  'bureau_approved',
  'committee_approved',
  'applied',
  'rejected',
  // legacy back-compat values.
  'pending',
  'approved',
] as const;

const crStatusSchema = z.enum(CHANGE_REQUEST_STATUS_VALUES);

/**
 * PATCH /api/change-requests/[id] — update the impact-analysis fields
 * before a transition. All fields optional; the route patches in-place.
 */
export const patchChangeRequestImpactSchema = z
  .object({
    impactScheduleDays: z.number().int(),
    impactBudgetTHB: z.number(),
    impactScope: z.string(),
  })
  .partial()
  .strict()
  .refine(
    (data) => Object.keys(data).length > 0,
    'At least one impact field is required',
  );

export type PatchChangeRequestImpactBody = z.infer<
  typeof patchChangeRequestImpactSchema
>;

/**
 * POST /api/change-requests/[id]/transition — advance the CR's status.
 * `reason` is required when transitioning to `rejected` (rationale for
 * the audit trail) and optional otherwise.
 */
export const transitionChangeRequestSchema = z
  .object({
    toStatus: crStatusSchema,
    reason: z.string().optional(),
  })
  .strict();

export type TransitionChangeRequestBody = z.infer<
  typeof transitionChangeRequestSchema
>;
