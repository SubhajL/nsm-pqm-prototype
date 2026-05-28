import {
  getGanttDataForProject,
  getGanttStore,
  getNextGanttTaskId,
} from '@/lib/gantt-store';
import type { GanttData } from '@/types/gantt';

/**
 * Gantt is structured per-project (one `GanttData` blob per projectId) rather
 * than as a flat collection, so the standard `Repository<T>` surface doesn't
 * apply. Instead we expose targeted methods for the operations the API routes
 * actually perform.
 */
export interface GanttRepository {
  getProjectData(projectId: string): Promise<GanttData>;
  nextTaskId(projectId: string): Promise<number>;
  /**
   * Returns the entire per-project store. Used by snapshot/restore code paths
   * and by callers that need raw access (e.g. mutating tasks/links arrays
   * in place during a transactional API write).
   */
  allByProject(): Promise<Record<string, GanttData>>;
}

export class InMemoryGanttRepository implements GanttRepository {
  async getProjectData(projectId: string): Promise<GanttData> {
    return getGanttDataForProject(projectId);
  }

  async nextTaskId(projectId: string): Promise<number> {
    return getNextGanttTaskId(projectId);
  }

  async allByProject(): Promise<Record<string, GanttData>> {
    return getGanttStore();
  }
}
