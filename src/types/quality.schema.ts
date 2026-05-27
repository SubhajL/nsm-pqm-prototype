import { z } from 'zod';

/**
 * Zod schemas for the quality domain (gates + inspections).
 *
 * The inspections POST/PATCH/DELETE routes accept narrowly shaped bodies;
 * these schemas mirror that wire shape and reject anything else at the
 * boundary. The quality-gates route is read-only and is intentionally not
 * covered here.
 */

const inspectionWorkflowStatusSchema = z.enum(['confirmed', 'signed']);

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
