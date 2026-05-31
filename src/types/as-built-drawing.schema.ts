/**
 * PR-26 — Zod schema for the AsBuiltDrawing API surface.
 *
 * `uploadedAt` is filled by the route from `Date.now()` (no client-
 * supplied timestamps for audit attribution).
 */

import { z } from 'zod';

export const createAsBuiltDrawingRequestSchema = z
  .object({
    drawingNumber: z.string().min(1, 'drawingNumber is required'),
    title: z.string().min(1, 'title is required'),
    revision: z.string().min(1, 'revision is required'),
    documentFileId: z.string().min(1).nullable().optional(),
    notes: z.string().optional(),
  })
  .strict();

export type CreateAsBuiltDrawingRequest = z.infer<
  typeof createAsBuiltDrawingRequestSchema
>;
