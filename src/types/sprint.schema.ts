/**
 * PR-30a — Zod schemas for the IT Sprint API surface.
 *
 *   - `createItSprintRequestSchema` — POST body for creating a sprint.
 *   - `updateItSprintRequestSchema` — PATCH body for velocity / notes
 *     updates (every field optional, but at least one must be present).
 */

import { z } from 'zod';

export const createItSprintRequestSchema = z
  .object({
    lifecycleStage: z.string().min(1).optional(),
    sprintNumber: z
      .number()
      .int()
      .positive('sprintNumber must be a positive integer'),
    startDate: z.string().min(1, 'startDate is required'),
    endDate: z.string().min(1, 'endDate is required'),
    goal: z.string().min(1, 'goal is required'),
    velocityPoints: z.number().nonnegative('velocityPoints must be ≥ 0'),
    completedPoints: z.number().nonnegative().optional(),
    notes: z.string().optional(),
  })
  .strict();

export type CreateItSprintRequest = z.infer<typeof createItSprintRequestSchema>;

export const updateItSprintRequestSchema = z
  .object({
    velocityPoints: z.number().nonnegative().optional(),
    completedPoints: z.number().nonnegative().optional(),
    goal: z.string().min(1).optional(),
    notes: z.string().optional(),
  })
  .strict()
  .refine(
    (data) => Object.keys(data).length > 0,
    'at least one field must be provided',
  );

export type UpdateItSprintRequest = z.infer<typeof updateItSprintRequestSchema>;
