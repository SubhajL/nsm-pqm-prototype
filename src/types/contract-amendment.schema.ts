/**
 * PR-24 — Zod schema for ContractAmendment POST.
 */

import { z } from 'zod';

export const createContractAmendmentRequestSchema = z
  .object({
    amendmentNumber: z
      .number()
      .int()
      .min(1, 'amendmentNumber must be >= 1'),
    amendedAt: z.string().min(1, 'amendedAt is required'),
    amountDelta: z.number(),
    scheduleDeltaDays: z.number().int(),
    reason: z.string().min(1, 'reason is required'),
    approvedBy: z.string().min(1, 'approvedBy is required'),
    documentFileId: z.string().nullable().optional(),
  })
  .strict();

export type CreateContractAmendmentRequest = z.infer<
  typeof createContractAmendmentRequestSchema
>;
