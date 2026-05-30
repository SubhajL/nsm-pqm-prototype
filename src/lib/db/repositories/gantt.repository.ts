import { eq } from 'drizzle-orm';

import type { Db } from '@/lib/db/client';
import { ganttProjects } from '@/lib/db/schema';
import type { GanttRepository } from '@/lib/repositories/gantt.repository';
import type { GanttData, GanttLink, GanttTask } from '@/types/gantt';

/**
 * GanttData is stored as a single row per project (tasks + links as jsonb
 * arrays). PR-21b: added `replaceProjectData` for routes that mutate the
 * arrays in place and need to flush the full blob back.
 */
export class DatabaseGanttRepository implements GanttRepository {
  constructor(private readonly db: Db) {}

  async getProjectData(projectId: string): Promise<GanttData> {
    const rows = await this.db
      .select()
      .from(ganttProjects)
      .where(eq(ganttProjects.projectId, projectId))
      .limit(1);

    if (!rows[0]) {
      // Match InMemory: lazily create the per-project blob on first read.
      await this.db
        .insert(ganttProjects)
        .values({ projectId, tasks: [], links: [] })
        .onConflictDoNothing();
      return { data: [], links: [] };
    }

    return {
      data: rows[0].tasks ?? [],
      links: rows[0].links ?? [],
    };
  }

  async nextTaskId(projectId: string): Promise<number> {
    const data = await this.getProjectData(projectId);
    const maxTaskId = data.data.reduce(
      (max: number, task: GanttTask) => Math.max(max, Number(task.id) || 0),
      0,
    );
    const maxLinkId = data.links.reduce(
      (max: number, link: GanttLink) => Math.max(max, Number(link.id) || 0),
      0,
    );
    return Math.max(maxTaskId, maxLinkId) + 1;
  }

  async replaceProjectData(projectId: string, data: GanttData): Promise<GanttData> {
    const existing = await this.db
      .select()
      .from(ganttProjects)
      .where(eq(ganttProjects.projectId, projectId))
      .limit(1);

    if (!existing[0]) {
      await this.db
        .insert(ganttProjects)
        .values({ projectId, tasks: data.data, links: data.links });
    } else {
      await this.db
        .update(ganttProjects)
        .set({ tasks: data.data, links: data.links })
        .where(eq(ganttProjects.projectId, projectId));
    }
    return data;
  }

  async allByProject(): Promise<Record<string, GanttData>> {
    const rows = await this.db.select().from(ganttProjects);
    const result: Record<string, GanttData> = {};
    for (const row of rows) {
      result[row.projectId] = { data: row.tasks ?? [], links: row.links ?? [] };
    }
    return result;
  }
}
