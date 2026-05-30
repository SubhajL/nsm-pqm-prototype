import { z } from 'zod';

import {
  CONTRACTING_MODELS,
  DELIVERY_METHODS,
  PROJECT_CLASSES,
  PROJECT_SIZE_TIERS,
  RID_LIFECYCLE_STAGES,
} from '@/types/rid/vocabulary';

/**
 * Zod schemas for the `project` domain.
 *
 * These mirror the TypeScript types in `./project.ts` for runtime validation
 * at the API write boundary. Request-body schemas describe the wire shape
 * (server assigns id/code/derived fields), and may differ from the full entity.
 */

export const projectClassSchema = z.enum(PROJECT_CLASSES);

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

export const deliveryMethodSchema = z.enum(DELIVERY_METHODS);
export const contractingModelSchema = z.enum(CONTRACTING_MODELS);

/**
 * Project size tier — coarse budget bucket used for approval-authority routing.
 * On create requests the field is optional and defaults to `'medium'`; the
 * server may overwrite it by inferring from `budget` via `classifyProjectSize`.
 * On the full Project entity the field is required.
 */
export const projectSizeTierSchema = z.enum(PROJECT_SIZE_TIERS);

/**
 * RID lifecycle stage validator (PR-16). Mirrors the canonical
 * `RidLifecycleStage` union from the vocabulary module so the wire shape
 * cannot drift from the runtime type.
 */
export const ridLifecycleStageSchema = z.enum(RID_LIFECYCLE_STAGES);

/**
 * Validator for a single entry in `Project.lifecycleStageHistory`.
 *
 * `enteredBy` is nullable to permit the auto-seeded first entry which has no
 * actor. `artifactDocIds` is an array of `DocumentFile.id` strings — empty
 * is allowed (most stages have only optional artifacts for MVP).
 */
export const lifecycleStageHistoryEntrySchema = z
  .object({
    stage: ridLifecycleStageSchema,
    enteredAt: z.string().min(1, 'enteredAt is required'),
    enteredBy: z.string().nullable(),
    artifactDocIds: z.array(z.string()),
  })
  .strict();

/**
 * Body schema for `PATCH /api/projects/[id]/lifecycle` (PR-16). The acting
 * user + ISO timestamp are derived server-side; the wire body carries only
 * the target stage and the citing artifacts.
 */
export const advanceLifecycleStageRequestSchema = z
  .object({
    targetStage: ridLifecycleStageSchema,
    artifactDocIds: z.array(z.string()),
  })
  .strict();

export type AdvanceLifecycleStageRequest = z.infer<
  typeof advanceLifecycleStageRequestSchema
>;

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
    projectClass: projectClassSchema,
    deliveryMethod: deliveryMethodSchema.optional(),
    contractingModel: contractingModelSchema.nullable().optional(),
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
 * persistence adapters).
 *
 * Composition rules (PR-14 + PR-15 + PR-16):
 * - `deliveryMethod` is required (no fallback; PR-15 dropped the
 *   pre-PR-13 `executionModel` alias).
 * - `contractingModel` is nullable but always present on the entity.
 * - `sizeTier` is REQUIRED here even though the create request schema
 *   defaults it; by the time a Project is materialised every row must carry
 *   an explicit tier so downstream consumers (authority routing, reporting
 *   rollups) never see `undefined`.
 * - `currentLifecycleStage` + `lifecycleStageHistory` come from PR-16; the
 *   history is always non-empty (seed migration ensures a `planning` entry).
 */
export const projectEntitySchema = z
  .object({
    id: z.string().min(1),
    code: z.string().min(1),
    name: z.string().min(1),
    nameEn: z.string(),
    projectClass: projectClassSchema,
    deliveryMethod: deliveryMethodSchema,
    contractingModel: contractingModelSchema.nullable(),
    sizeTier: projectSizeTierSchema,
    status: projectStatusSchema,
    budget: z.number().nonnegative(),
    progress: z.number(),
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
    currentLifecycleStage: ridLifecycleStageSchema,
    lifecycleStageHistory: z.array(lifecycleStageHistoryEntrySchema),
  })
  .strict();

/**
 * Back-compat alias retained so call sites introduced in PR-14
 * (e.g. `src/lib/rid/approval-authority.test.ts`) continue to type-check.
 * `fullProjectSchema` and `projectEntitySchema` refer to the same canonical
 * schema; new code should prefer `projectEntitySchema`.
 */
export const fullProjectSchema = projectEntitySchema;

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
