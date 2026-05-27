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
