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

/**
 * PR-31 cleanup — the canonical transition body is `{ targetState }`,
 * matching work-periods / handover / vendor-SOWs. The legacy `{ to }`
 * spelling (PR-24) is still accepted and normalized via preprocess;
 * a body carrying BOTH spellings is rejected by `.strict()` because the
 * leftover `to` key survives preprocessing as an unknown field.
 */
export const transitionProcurementRequestSchema = z.preprocess(
  (raw) => {
    if (
      raw !== null &&
      typeof raw === 'object' &&
      'to' in raw &&
      !('targetState' in raw)
    ) {
      const { to, ...rest } = raw as Record<string, unknown>;
      return { ...rest, targetState: to };
    }
    return raw;
  },
  z
    .object({
      targetState: procurementStateSchema,
    })
    .strict(),
);

export type TransitionProcurementRequest = z.infer<
  typeof transitionProcurementRequestSchema
>;
