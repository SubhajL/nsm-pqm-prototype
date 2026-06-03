import type { ProjectEvaluation } from '@/types/evaluation';

/**
 * One canonical evaluation per project, so the surface is narrow:
 * `findByProject` for the read, `upsert` for create-or-replace. No full
 * CRUD — evaluations are not listed or hard-deleted in the demo.
 */
export interface ProjectEvaluationRepository {
  findByProject(projectId: string): Promise<ProjectEvaluation | null>;
  upsert(evaluation: ProjectEvaluation): Promise<ProjectEvaluation>;
}
