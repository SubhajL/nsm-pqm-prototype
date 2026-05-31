/**
 * PR-24 — Zod schema for EngineeringEstimate POST.
 */

import { z } from 'zod';

import { ENGINEERING_ESTIMATE_BASES } from './engineering-estimate';

const basisSchema = z.enum(ENGINEERING_ESTIMATE_BASES);

export const createEngineeringEstimateRequestSchema = z
  .object({
    boqId: z.string().nullable().optional(),
    basis: basisSchema,
    estimatedTotal: z.number().nonnegative('estimatedTotal must be non-negative'),
    contingencyPercent: z
      .number()
      .min(0, 'contingencyPercent must be >= 0')
      .max(1, 'contingencyPercent must be <= 1 (fraction, not percent)'),
    estimatedBy: z.string().min(1, 'estimatedBy is required'),
    estimatedAt: z.string().min(1, 'estimatedAt is required'),
    notes: z.string().optional(),
  })
  .strict();

export type CreateEngineeringEstimateRequest = z.infer<
  typeof createEngineeringEstimateRequestSchema
>;
