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
