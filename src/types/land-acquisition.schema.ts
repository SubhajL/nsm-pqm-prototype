/**
 * PR-25 — Zod schemas for land-acquisition records.
 */

import { z } from 'zod';

import { LAND_ACQ_STATUSES } from './land-acquisition';

const landAcqStatusSchema = z.enum(LAND_ACQ_STATUSES);

export const createLandAcquisitionRequestSchema = z
  .object({
    parcelReference: z.string().min(1, 'parcelReference is required'),
    landownerName: z.string().min(1, 'landownerName is required'),
    areaRai: z.number().min(0, 'areaRai must be >= 0'),
    status: landAcqStatusSchema.optional(),
    compensationAmount: z.number().nullable().optional(),
    notes: z.string().optional(),
  })
  .strict();

export type CreateLandAcquisitionRequest = z.infer<
  typeof createLandAcquisitionRequestSchema
>;

export const landAcquisitionEntitySchema = z.object({
  id: z.string(),
  projectId: z.string(),
  parcelReference: z.string(),
  landownerName: z.string(),
  areaRai: z.number(),
  status: landAcqStatusSchema,
  compensationAmount: z.number().nullable(),
  notes: z.string(),
});
