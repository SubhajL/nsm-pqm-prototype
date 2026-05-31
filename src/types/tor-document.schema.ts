/**
 * PR-24 — Zod schema for TOR document POST.
 */

import { z } from 'zod';

export const createTorDocumentRequestSchema = z
  .object({
    version: z.number().int().min(1, 'version must be >= 1'),
    scopeSummary: z.string().min(1, 'scopeSummary is required'),
    technicalRequirements: z.string().min(1, 'technicalRequirements is required'),
    deliverySchedule: z.string().min(1, 'deliverySchedule is required'),
    evaluationCriteria: z.string().min(1, 'evaluationCriteria is required'),
    documentFileId: z.string().nullable().optional(),
    approvedAt: z.string().nullable().optional(),
  })
  .strict();

export type CreateTorDocumentRequest = z.infer<typeof createTorDocumentRequestSchema>;
