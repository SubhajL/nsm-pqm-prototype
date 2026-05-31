/**
 * PR-25 — Zod schemas for environmental assessments.
 */

import { z } from 'zod';

import { EIA_STATUSES } from './environmental-assessment';

const eiaStatusSchema = z.enum(EIA_STATUSES);
const eiaKindSchema = z.enum(['EIA', 'IEE', 'environmental_checklist']);

export const createEnvironmentalAssessmentRequestSchema = z
  .object({
    kind: eiaKindSchema,
    status: eiaStatusSchema.optional(),
    approvedAt: z.string().nullable().optional(),
    approvalReference: z.string().nullable().optional(),
    notes: z.string().optional(),
  })
  .strict();

export type CreateEnvironmentalAssessmentRequest = z.infer<
  typeof createEnvironmentalAssessmentRequestSchema
>;

export const environmentalAssessmentEntitySchema = z.object({
  id: z.string(),
  projectId: z.string(),
  kind: eiaKindSchema,
  status: eiaStatusSchema,
  approvedAt: z.string().nullable(),
  approvalReference: z.string().nullable(),
  notes: z.string(),
});
