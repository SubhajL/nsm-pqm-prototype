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
   * Persist the entire per-project `GanttData` blob (tasks + links).
   * Replaces whatever is currently stored. Used by API routes that mutate
   * the tasks/links arrays in place and need to flush the result.
   */
  replaceProjectData(projectId: string, data: GanttData): Promise<GanttData>;
  /**
   * Returns the entire per-project store. Used by callers that need to
   * iterate across projects (export, parity checks).
   */
  allByProject(): Promise<Record<string, GanttData>>;
}
