import { jsonb, pgTable, text } from 'drizzle-orm/pg-core';

import type { GanttLink, GanttTask } from '@/types/gantt';

/**
 * Gantt is stored as ONE row per project, with `tasks` and `links` as
 * jsonb arrays. This mirrors the per-project blob shape of `GanttData`
 * and avoids an O(tasks) join cost on every render.
 *
 * Trade-off: per-task updates rewrite the whole blob. Acceptable because
 * the API always serializes the entire `GanttData` on every PATCH.
 */
export const ganttProjects = pgTable('gantt_projects', {
  projectId: text('project_id').primaryKey(),
  tasks: jsonb('tasks').$type<GanttTask[]>().notNull().default([]),
  links: jsonb('links').$type<GanttLink[]>().notNull().default([]),
});

export type GanttRow = typeof ganttProjects.$inferSelect;
export type GanttInsert = typeof ganttProjects.$inferInsert;
