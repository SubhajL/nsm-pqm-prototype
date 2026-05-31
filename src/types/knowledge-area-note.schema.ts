/**
 * PR-30a — Zod schema for the DT6 knowledge-area note API.
 *
 * Versioning is server-driven (the route computes `version: previous + 1`
 * from the highest existing row), so the request body only carries the
 * area + content payload.
 */

import { z } from 'zod';

import { DT6_AREAS } from './knowledge-area-note';

const dt6AreaSchema = z.enum(DT6_AREAS);

export const createKnowledgeAreaNoteRequestSchema = z
  .object({
    area: dt6AreaSchema,
    content: z.string().min(1, 'content is required'),
  })
  .strict();

export type CreateKnowledgeAreaNoteRequest = z.infer<
  typeof createKnowledgeAreaNoteRequestSchema
>;
