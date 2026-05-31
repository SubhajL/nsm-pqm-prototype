/**
 * PR-24 — Zod schema for ContractorPrequalification POST.
 */

import { z } from 'zod';

export const createContractorPrequalificationRequestSchema = z
  .object({
    contractorName: z.string().min(1, 'contractorName is required'),
    contractorTaxId: z.string().nullable().optional(),
    prequalifiedAt: z.string().min(1, 'prequalifiedAt is required'),
    validUntil: z.string().nullable().optional(),
    ahpScore: z.number().nullable().optional(),
    evidenceDocIds: z.array(z.string()).optional(),
    notes: z.string().optional(),
  })
  .strict();

export type CreateContractorPrequalificationRequest = z.infer<
  typeof createContractorPrequalificationRequestSchema
>;
