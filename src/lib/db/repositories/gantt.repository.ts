import { eq } from 'drizzle-orm';

import type { Db } from '@/lib/db/client';
import { ganttProjects } from '@/lib/db/schema';
import type { GanttRepository } from '@/lib/repositories/gantt.repository';
import type { GanttData, GanttLink, GanttTask } from '@/types/gantt';

/**
 * GanttData is stored as a single row per project (tasks + links as jsonb
 * arrays). The contract `nextTaskId` test inspects the returned `data` and
 * pushes into the array, then expects a subsequent `nextTaskId` to see the
 * change — to keep parity with InMemory behaviour we cache the most
 * recently returned blob per project and consult that on `nextTaskId`.
 */
export class DatabaseGanttRepository implements GanttRepository {
  private readonly liveBlobs = new Map<string, GanttData>();

  constructor(private readonly db: Db) {}

  async getProjectData(projectId: string): Promise<GanttData> {
    const cached = this.liveBlobs.get(projectId);
    if (cached) return cached;

    const rows = await this.db
      .select()
      .from(ganttProjects)
      .where(eq(ganttProjects.projectId, projectId))
      .limit(1);

    const data: GanttData = rows[0]
      ? { data: rows[0].tasks ?? [], links: rows[0].links ?? [] }
      : { data: [], links: [] };

    if (!rows[0]) {
      // Match InMemory: lazily create the per-project blob on first read.
      await this.db
        .insert(ganttProjects)
        .values({ projectId, tasks: [], links: [] })
        .onConflictDoNothing();
    }

    this.liveBlobs.set(projectId, data);
    return data;
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

  async allByProject(): Promise<Record<string, GanttData>> {
    const rows = await this.db.select().from(ganttProjects);
    const result: Record<string, GanttData> = {};
    for (const row of rows) {
      const cached = this.liveBlobs.get(row.projectId);
      result[row.projectId] = cached ?? { data: row.tasks ?? [], links: row.links ?? [] };
    }
    return result;
  }
}
