/**
 * PR-24 — Zod schemas for ProcurementPackage routes.
 *
 * - `createProcurementPackageRequestSchema` — POST body for
 *   `/api/procurement-packages/[projectId]`.
 * - `transitionProcurementRequestSchema` — POST body for
 *   `/api/procurement-packages/[packageId]/transition`.
 */

import { z } from 'zod';

import { PROCUREMENT_METHODS, PROCUREMENT_STATES } from './procurement-package';

const procurementStateSchema = z.enum(PROCUREMENT_STATES);
const procurementMethodSchema = z.enum(PROCUREMENT_METHODS);

export const createProcurementPackageRequestSchema = z
  .object({
    name: z.string().min(1, 'name is required'),
    budgetCeiling: z.number().nonnegative('budgetCeiling must be non-negative'),
    procurementMethod: procurementMethodSchema,
    state: procurementStateSchema.optional(),
    openedAt: z.string().nullable().optional(),
    closedAt: z.string().nullable().optional(),
    notes: z.string().optional(),
  })
  .strict();

export type CreateProcurementPackageRequest = z.infer<
  typeof createProcurementPackageRequestSchema
>;

export const transitionProcurementRequestSchema = z
  .object({
    to: procurementStateSchema,
  })
  .strict();

export type TransitionProcurementRequest = z.infer<
  typeof transitionProcurementRequestSchema
>;
