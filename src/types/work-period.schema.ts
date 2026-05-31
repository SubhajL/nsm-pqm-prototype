/**
 * PR-23 — Zod schemas for the WorkPeriod (งวดงาน) API surface.
 *
 * - `createWorkPeriodRequestSchema` — POST body for creating a งวดงาน.
 * - `transitionWorkPeriodRequestSchema` — POST body for state transitions
 *   (the route additionally consults the state-machine helper for
 *   delivery-method-aware validation; this schema is the wire-shape gate).
 */

import { z } from 'zod';

import { WORK_PERIOD_STATES } from './work-period';

const workPeriodStateSchema = z.enum(WORK_PERIOD_STATES);

export const createWorkPeriodRequestSchema = z
  .object({
    milestoneId: z.string().nullable().optional(),
    number: z.number().int().positive('number must be a positive integer'),
    title: z.string().min(1, 'title is required'),
    deliverables: z.array(z.string().min(1)).default([]),
    plannedStartDate: z.string().min(1, 'plannedStartDate is required'),
    plannedEndDate: z.string().min(1, 'plannedEndDate is required'),
    amount: z.number().nonnegative('amount must be ≥ 0'),
    percentage: z
      .number()
      .min(0, 'percentage must be ≥ 0')
      .max(100, 'percentage must be ≤ 100'),
    state: workPeriodStateSchema.optional(),
  })
  .strict();

export type CreateWorkPeriodRequest = z.infer<
  typeof createWorkPeriodRequestSchema
>;

export const transitionWorkPeriodRequestSchema = z
  .object({
    targetState: workPeriodStateSchema,
  })
  .strict();

export type TransitionWorkPeriodRequest = z.infer<
  typeof transitionWorkPeriodRequestSchema
>;
