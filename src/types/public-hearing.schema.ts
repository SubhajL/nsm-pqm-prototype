/**
 * PR-25 — Zod schemas for public hearings.
 */

import { z } from 'zod';

export const createPublicHearingRequestSchema = z
  .object({
    heldAt: z.string().min(1, 'heldAt is required'),
    location: z.string().min(1, 'location is required'),
    attendeeCount: z.number().int().min(0),
    summary: z.string().optional(),
    signedMinuteDocId: z.string().nullable().optional(),
  })
  .strict();

export type CreatePublicHearingRequest = z.infer<
  typeof createPublicHearingRequestSchema
>;

export const publicHearingEntitySchema = z.object({
  id: z.string(),
  projectId: z.string(),
  heldAt: z.string(),
  location: z.string(),
  attendeeCount: z.number().int().min(0),
  summary: z.string(),
  signedMinuteDocId: z.string().nullable(),
});
