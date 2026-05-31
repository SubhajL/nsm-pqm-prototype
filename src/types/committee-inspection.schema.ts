/**
 * PR-23 — Zod schema for committee inspection records.
 */

import { z } from 'zod';

import { COMMITTEE_INSPECTION_RESULTS } from './committee-inspection';

const resultSchema = z.enum(COMMITTEE_INSPECTION_RESULTS);

export const createCommitteeInspectionRequestSchema = z
  .object({
    inspectors: z
      .array(z.string().min(1))
      .min(1, 'at least one inspector is required'),
    result: resultSchema,
    conditions: z.string().optional(),
    documentIds: z.array(z.string().min(1)).default([]),
  })
  .strict();

export type CreateCommitteeInspectionRequest = z.infer<
  typeof createCommitteeInspectionRequestSchema
>;
