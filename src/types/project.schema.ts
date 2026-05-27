import { z } from 'zod';

import { DELIVERY_METHODS, PROJECT_SIZE_TIERS } from '@/types/rid/vocabulary';

/**
 * Zod schemas for the `project` domain.
 *
 * These mirror the TypeScript types in `./project.ts` for runtime validation
 * at the API write boundary. Request-body schemas describe the wire shape
 * (server assigns id/code/derived fields), and may differ from the full entity.
 */

export const projectTypeSchema = z.enum([
  'construction',
  'it',
  'equipment',
  'academic',
  'renovation',
]);

export const projectStatusSchema = z.enum([
  'draft',
  'planning',
  'in_progress',
  'on_hold',
  'completed',
  'cancelled',
]);

export const projectScheduleHealthSchema = z.enum([
  'on_schedule',
  'watch',
  'delayed',
]);

export const projectExecutionModelSchema = z.enum(DELIVERY_METHODS);

/**
 * Project size tier — coarse budget bucket used for approval-authority routing.
 * On create requests the field is optional and defaults to `'medium'`; the
 * server may overwrite it by inferring from `budget` via `classifyProjectSize`.
 * On the full Project entity the field is required.
 */
export const projectSizeTierSchema = z.enum(PROJECT_SIZE_TIERS);

const milestoneInputSchema = z.object({
  milestone: z.number(),
  amount: z.number().nonnegative(),
  percentage: z.number().min(0).max(100),
  deliverable: z.string(),
});

export const createProjectRequestSchema = z
  .object({
    name: z.string().min(1, 'name is required'),
    nameEn: z.string().optional(),
    type: projectTypeSchema,
    executionModel: projectExecutionModelSchema.optional(),
    sizeTier: projectSizeTierSchema.optional().default('medium'),
    status: projectStatusSchema.optional(),
    budget: z.number().nonnegative(),
    progress: z.number().min(0).max(1).optional(),
    scheduleHealth: projectScheduleHealthSchema.optional(),
    startDate: z.string().min(1, 'startDate is required'),
    endDate: z.string().min(1, 'endDate is required'),
    duration: z.number().int().nonnegative(),
    spiValue: z.number().optional(),
    cpiValue: z.number().optional(),
    managerId: z.string().min(1, 'managerId is required'),
    managerName: z.string().min(1, 'managerName is required'),
    departmentId: z.string().min(1, 'departmentId is required'),
    departmentName: z.string().min(1, 'departmentName is required'),
    openIssues: z.number().int().nonnegative().optional(),
    highRisks: z.number().int().nonnegative().optional(),
    currentMilestone: z.number().int().nonnegative().optional(),
    totalMilestones: z.number().int().nonnegative().optional(),
    milestones: z.array(milestoneInputSchema).optional(),
  })
  .strict();

export type CreateProjectRequest = z.infer<typeof createProjectRequestSchema>;

/**
 * Full Project entity schema — mirrors `Project` in `./project.ts` for runtime
 * validation at hydration boundaries (e.g. seed-shape regression tests, future
 * persistence adapters). `sizeTier` is REQUIRED here even though the create
 * request schema defaults it; by the time a Project is materialised every row
 * must carry an explicit tier so downstream consumers (authority routing,
 * reporting rollups) never see `undefined`.
 */
export const fullProjectSchema = z
  .object({
    id: z.string().min(1),
    code: z.string().min(1),
    name: z.string().min(1),
    nameEn: z.string(),
    type: projectTypeSchema,
    executionModel: projectExecutionModelSchema,
    sizeTier: projectSizeTierSchema,
    status: projectStatusSchema,
    budget: z.number().nonnegative(),
    progress: z.number().min(0).max(1),
    scheduleHealth: projectScheduleHealthSchema.optional(),
    startDate: z.string().min(1),
    endDate: z.string().min(1),
    duration: z.number().int().nonnegative(),
    spiValue: z.number(),
    cpiValue: z.number(),
    managerId: z.string().min(1),
    managerName: z.string().min(1),
    departmentId: z.string().min(1),
    departmentName: z.string().min(1),
    openIssues: z.number().int().nonnegative(),
    highRisks: z.number().int().nonnegative(),
    currentMilestone: z.number().int().nonnegative(),
    totalMilestones: z.number().int().nonnegative(),
  })
  .passthrough();

/**
 * Only `draft`, `on_hold`, and `cancelled` can be set manually on a project.
 * `planning`, `in_progress`, and `completed` are derived from Gantt execution.
 */
export const updateProjectStatusRequestSchema = z
  .object({
    status: z.enum(['draft', 'on_hold', 'cancelled']),
  })
  .strict();

export type UpdateProjectStatusRequest = z.infer<
  typeof updateProjectStatusRequestSchema
>;
