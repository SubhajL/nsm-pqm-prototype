/**
 * PR-30a — Zod schemas for the Vendor SOW API surface.
 *
 *   - `createVendorSowRequestSchema` — POST body for creating a SOW.
 *   - `transitionVendorSowRequestSchema` — POST body for state transitions
 *     (the route additionally consults `canTransitionSow()` from
 *     `src/lib/rid/it-class-helpers.ts` for the actual state-machine
 *     decision; this schema is the wire-shape gate).
 */

import { z } from 'zod';

import { SOW_STATES } from './vendor-sow';

const sowStateSchema = z.enum(SOW_STATES);

export const createVendorSowRequestSchema = z
  .object({
    phase: z.string().min(1, 'phase is required'),
    scopeSummary: z.string().min(1, 'scopeSummary is required'),
    uatCriteria: z.string().min(1, 'uatCriteria is required'),
    warrantyMonths: z.number().int().nonnegative().nullable().optional(),
    contractId: z.string().nullable().optional(),
    notes: z.string().optional(),
    state: sowStateSchema.optional(),
  })
  .strict();

export type CreateVendorSowRequest = z.infer<
  typeof createVendorSowRequestSchema
>;

export const transitionVendorSowRequestSchema = z
  .object({
    targetState: sowStateSchema,
  })
  .strict();

export type TransitionVendorSowRequest = z.infer<
  typeof transitionVendorSowRequestSchema
>;
