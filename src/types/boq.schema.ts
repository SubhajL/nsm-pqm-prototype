import { z } from 'zod';

/**
 * Zod schemas for the BOQ (Bill of Quantities) domain.
 *
 * The BOQItem entity is defined inline in
 * `src/app/api/boq/[wbsId]/route.ts`. This schema mirrors only the create
 * request body shape (the route derives `id`, `wbsId`, and `total` itself).
 */

export const createBoqItemRequestSchema = z
  .object({
    description: z.string().min(1, 'description is required'),
    quantity: z.number().nonnegative().optional(),
    unit: z.string().min(1, 'unit is required'),
    unitPrice: z.number().nonnegative().optional(),
  })
  .strict();

export type CreateBoqItemRequest = z.infer<typeof createBoqItemRequestSchema>;

/** PR-C2 — PATCH body. Server recomputes `total` from quantity × unitPrice. */
export const updateBoqItemRequestSchema = z
  .object({
    id: z.string().min(1, 'id is required'),
    description: z.string().min(1, 'description cannot be empty').optional(),
    quantity: z.number().nonnegative().optional(),
    unit: z.string().min(1, 'unit cannot be empty').optional(),
    unitPrice: z.number().nonnegative().optional(),
  })
  .strict();

export type UpdateBoqItemRequest = z.infer<typeof updateBoqItemRequestSchema>;

/** PR-C2 — DELETE body. */
export const deleteBoqItemRequestSchema = z
  .object({ id: z.string().min(1, 'id is required') })
  .strict();

export type DeleteBoqItemRequest = z.infer<typeof deleteBoqItemRequestSchema>;
