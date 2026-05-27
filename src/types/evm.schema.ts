import { z } from 'zod';

/**
 * Zod schemas for the EVM domain (`src/types/evm.ts`).
 *
 * The EVM POST route requires `month`, `pv`, and `ev`. For outsourced
 * projects the route additionally requires `paidToDate`; that conditional is
 * enforced in the handler (it depends on the persisted project's execution
 * model, which isn't part of the request body). This schema just guards
 * shape.
 */

export const createEvmDataPointRequestSchema = z
  .object({
    month: z.string().min(1, 'month is required'),
    monthThai: z.string().optional(),
    pv: z.number(),
    ev: z.number(),
    ac: z.number().optional(),
    paidToDate: z.number().optional(),
  })
  .strict();

export type CreateEvmDataPointRequest = z.infer<
  typeof createEvmDataPointRequestSchema
>;

export const deleteEvmDataPointRequestSchema = z
  .object({
    id: z.string().min(1, 'id is required'),
  })
  .strict();

export type DeleteEvmDataPointRequest = z.infer<
  typeof deleteEvmDataPointRequestSchema
>;
