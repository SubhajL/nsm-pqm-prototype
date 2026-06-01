import { z } from 'zod';

/**
 * Zod schemas for the quality domain (gates + inspections).
 *
 * The inspections POST/PATCH/DELETE routes accept narrowly shaped bodies;
 * these schemas mirror that wire shape and reject anything else at the
 * boundary. Per PR-PRQM-K, the gates transition route and the new
 * `/api/quality/inspections/[id]` PATCH route are also covered here.
 */

const inspectionWorkflowStatusSchema = z.enum(['confirmed', 'signed']);

/**
 * PR-PRQM-K — POST body for `/api/quality/gates/[projectId]/transition`.
 *
 * `toState` is constrained to the three legal target states; the pure
 * state machine then validates the edge against the current state.
 */
export const transitionQualityGateRequestSchema = z
  .object({
    gateId: z.string().min(1, 'gateId is required'),
    toState: z.enum(['passed', 'conditional', 'pending']),
  })
  .strict();

export type TransitionQualityGateRequest = z.infer<
  typeof transitionQualityGateRequestSchema
>;

/**
 * PR-PRQM-K — PATCH body for `/api/quality/inspections/[id]`.
 *
 * Every field is optional; the route validates that at least one is
 * present and applies workflow-status transitions through the
 * state-machine guard.
 */
export const patchInspectionRequestSchema = z
  .object({
    overallResult: z.enum(['pass', 'conditional']).optional(),
    failReason: z.string().optional(),
    workflowStatus: z.enum(['draft', 'confirmed', 'signed']).optional(),
    checklist: z
      .array(
        z
          .object({
            id: z.string().min(1, 'id is required'),
            item: z.string(),
            criteria: z.string(),
            result: z.enum(['pass', 'fail']),
            note: z.string(),
          })
          .strict(),
      )
      .optional(),
  })
  .strict()
  .refine(
    (body) =>
      body.overallResult !== undefined ||
      body.failReason !== undefined ||
      body.workflowStatus !== undefined ||
      body.checklist !== undefined,
    {
      message:
        'At least one of overallResult / failReason / workflowStatus / checklist must be provided',
    },
  );

export type PatchInspectionRequest = z.infer<
  typeof patchInspectionRequestSchema
>;

export const createInspectionRequestSchema = z
  .object({
    projectId: z.string().min(1, 'projectId is required'),
    itpId: z.string().min(1, 'itpId is required'),
    title: z.string().min(1, 'title is required'),
    date: z.string().min(1, 'date is required'),
    time: z.string().min(1, 'time is required'),
    inspectors: z.array(z.string()).optional(),
    wbsLink: z.string().min(1, 'wbsLink is required'),
    standards: z.array(z.string()).optional(),
    overallResult: z.enum(['pass', 'conditional']).optional(),
    failReason: z.string().optional(),
  })
  .strict();

export type CreateInspectionRequest = z.infer<
  typeof createInspectionRequestSchema
>;

export const updateInspectionRequestSchema = z
  .object({
    id: z.string().min(1, 'id is required'),
    workflowStatus: inspectionWorkflowStatusSchema.optional(),
    checklistItemId: z.string().optional(),
    resolveAsPass: z.boolean().optional(),
  })
  .strict();

export type UpdateInspectionRequest = z.infer<
  typeof updateInspectionRequestSchema
>;

export const deleteInspectionRequestSchema = z
  .object({
    id: z.string().min(1, 'id is required'),
  })
  .strict();

export type DeleteInspectionRequest = z.infer<
  typeof deleteInspectionRequestSchema
>;
