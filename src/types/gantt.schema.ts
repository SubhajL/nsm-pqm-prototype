import { z } from 'zod';

/**
 * Zod schemas for the Gantt domain.
 *
 * Mirrors the wire shape accepted by `src/app/api/gantt/[projectId]/route.ts`.
 * The route does additional semantic validation (parent existence,
 * predecessor cycles, date-range sanity); this layer only catches the
 * "shape is wrong" class of input bugs.
 */

const ganttLinkTypeSchema = z.enum(['FS', 'SS', 'FF', 'SF']);

const ganttPredecessorEntrySchema = z
  .object({
    taskId: z.number().optional(),
    linkType: ganttLinkTypeSchema.optional(),
    lagDays: z.number().optional(),
  })
  .strict();

const ganttTaskBodyShape = {
  text: z.string().optional(),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  progress: z.number().optional(),
  parent: z.number().optional(),
  type: z.string().optional(),
  owner: z.string().optional(),
  predecessorIds: z.array(z.number()).optional(),
  predecessors: z.array(ganttPredecessorEntrySchema).optional(),
};

export const createGanttTaskRequestSchema = z
  .object({
    ...ganttTaskBodyShape,
  })
  .strict();

export const updateGanttTaskRequestSchema = z
  .object({
    id: z.number({ message: 'id is required' }),
    ...ganttTaskBodyShape,
  })
  .strict();

export const deleteGanttTaskRequestSchema = z
  .object({
    id: z.number({ message: 'id is required' }),
  })
  .strict();

export type CreateGanttTaskRequest = z.infer<typeof createGanttTaskRequestSchema>;
export type UpdateGanttTaskRequest = z.infer<typeof updateGanttTaskRequestSchema>;
export type DeleteGanttTaskRequest = z.infer<typeof deleteGanttTaskRequestSchema>;

/**
 * PR-3.5 — Dedicated dependency CRUD endpoints. The data already lives in
 * `GanttData.links`; these endpoints offer a focused surface for the new
 * UI's add-link / edit-link / delete-link actions without forcing a full
 * task PATCH.
 */
export const createGanttDependencyRequestSchema = z
  .object({
    predecessorId: z.number().int().positive(),
    successorId: z.number().int().positive(),
    type: ganttLinkTypeSchema.optional(),
    lagDays: z.number().int().optional(),
  })
  .strict();

export const updateGanttDependencyRequestSchema = z
  .object({
    id: z.number().int().positive(),
    type: ganttLinkTypeSchema.optional(),
    lagDays: z.number().int().optional(),
  })
  .strict();

export const deleteGanttDependencyRequestSchema = z
  .object({ id: z.number().int().positive() })
  .strict();

export type CreateGanttDependencyRequest = z.infer<
  typeof createGanttDependencyRequestSchema
>;
export type UpdateGanttDependencyRequest = z.infer<
  typeof updateGanttDependencyRequestSchema
>;
export type DeleteGanttDependencyRequest = z.infer<
  typeof deleteGanttDependencyRequestSchema
>;
