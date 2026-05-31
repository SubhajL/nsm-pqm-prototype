/**
 * PR-26 — Zod schema for the OmManualEntry API surface.
 */

import { z } from 'zod';

import { OM_MANUAL_CATEGORIES } from './om-manual';

const omManualCategorySchema = z.enum(OM_MANUAL_CATEGORIES);

export const createOmManualEntryRequestSchema = z
  .object({
    category: omManualCategorySchema,
    title: z.string().min(1, 'title is required'),
    documentFileId: z.string().min(1).nullable().optional(),
    notes: z.string().optional(),
  })
  .strict();

export type CreateOmManualEntryRequest = z.infer<
  typeof createOmManualEntryRequestSchema
>;
