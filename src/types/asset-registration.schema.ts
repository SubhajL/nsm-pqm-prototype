/**
 * PR-26 — Zod schema for the AssetRegistration API surface.
 */

import { z } from 'zod';

import { ASSET_TYPES } from './asset-registration';

const assetTypeSchema = z.enum(ASSET_TYPES);

export const createAssetRegistrationRequestSchema = z
  .object({
    assetCode: z.string().min(1, 'assetCode is required'),
    assetType: assetTypeSchema,
    installedAt: z.string().min(1, 'installedAt is required'),
    installedLocation: z.string().min(1, 'installedLocation is required'),
    initialValue: z
      .number()
      .nonnegative('initialValue must be non-negative'),
    costCenter: z.string().min(1).nullable().optional(),
    notes: z.string().optional(),
  })
  .strict();

export type CreateAssetRegistrationRequest = z.infer<
  typeof createAssetRegistrationRequestSchema
>;
