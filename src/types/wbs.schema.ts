import { z } from 'zod';

/**
 * Zod schemas for the WBS (Work Breakdown Structure) domain.
 *
 * The full WBS node type lives inline in
 * `src/app/api/wbs/[projectId]/route.ts` today; only the create request shape
 * needs runtime validation at the boundary.
 */

export const createWbsNodeRequestSchema = z
  .object({
    name: z.string().min(1, 'name is required'),
    parentId: z.string().nullable().optional(),
  })
  .strict();

export type CreateWbsNodeRequest = z.infer<typeof createWbsNodeRequestSchema>;

/** PR-C2 — PATCH body. All editable fields are optional. */
export const updateWbsNodeRequestSchema = z
  .object({
    id: z.string().min(1, 'id is required'),
    name: z.string().min(1, 'name cannot be empty').optional(),
    weight: z.number().min(0).max(100).optional(),
    progress: z.number().min(0).max(100).optional(),
  })
  .strict();

export type UpdateWbsNodeRequest = z.infer<typeof updateWbsNodeRequestSchema>;

/** PR-C2 — DELETE body. The route cascades to descendants + BOQ rows. */
export const deleteWbsNodeRequestSchema = z
  .object({ id: z.string().min(1, 'id is required') })
  .strict();

export type DeleteWbsNodeRequest = z.infer<typeof deleteWbsNodeRequestSchema>;
