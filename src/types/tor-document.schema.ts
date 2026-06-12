/**
 * PR-24 — Zod schema for TOR document POST.
 */

import { z } from 'zod';

/**
 * PR-34 — `version` is SERVER-ASSIGNED (latest + 1 per package); clients
 * no longer send it. `.strict()` rejects any body still carrying one.
 */
export const createTorDocumentRequestSchema = z
  .object({
    scopeSummary: z.string().min(1, 'scopeSummary is required'),
    technicalRequirements: z.string().min(1, 'technicalRequirements is required'),
    deliverySchedule: z.string().min(1, 'deliverySchedule is required'),
    evaluationCriteria: z.string().min(1, 'evaluationCriteria is required'),
    documentFileId: z.string().nullable().optional(),
    approvedAt: z.string().nullable().optional(),
  })
  .strict();

export type CreateTorDocumentRequest = z.infer<typeof createTorDocumentRequestSchema>;
