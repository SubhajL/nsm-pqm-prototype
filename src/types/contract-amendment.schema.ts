/**
 * PR-24 — Zod schema for ContractAmendment POST.
 */

import { z } from 'zod';

/**
 * PR-34 — `amendmentNumber` is SERVER-ASSIGNED (latest + 1 per
 * contract); clients no longer send it. `.strict()` rejects any body
 * still carrying one.
 */
export const createContractAmendmentRequestSchema = z
  .object({
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
