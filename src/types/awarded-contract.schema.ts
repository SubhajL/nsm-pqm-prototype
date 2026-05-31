/**
 * PR-24 — Zod schema for AwardedContract POST.
 */

import { z } from 'zod';

import { CONTRACTING_MODELS } from '@/types/rid/vocabulary';

import { CONTRACT_STATES } from './awarded-contract';

const contractStateSchema = z.enum(CONTRACT_STATES);
const contractingModelSchema = z.enum(CONTRACTING_MODELS);

export const createAwardedContractRequestSchema = z
  .object({
    procurementPackageId: z.string().min(1, 'procurementPackageId is required'),
    contractNumber: z.string().min(1, 'contractNumber is required'),
    contractorName: z.string().min(1, 'contractorName is required'),
    contractorTaxId: z.string().nullable().optional(),
    awardAmount: z.number().nonnegative('awardAmount must be non-negative'),
    contractingModel: contractingModelSchema,
    state: contractStateSchema.optional(),
    signedAt: z.string().nullable().optional(),
    effectiveDate: z.string().nullable().optional(),
    expirationDate: z.string().nullable().optional(),
    warrantyMonths: z.number().int().nonnegative().nullable().optional(),
    notes: z.string().optional(),
  })
  .strict();

export type CreateAwardedContractRequest = z.infer<
  typeof createAwardedContractRequestSchema
>;
