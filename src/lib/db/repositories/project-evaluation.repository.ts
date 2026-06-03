import { eq } from 'drizzle-orm';

import type { Db } from '@/lib/db/client';
import { projectEvaluations } from '@/lib/db/schema';
import type { ProjectEvaluationRepository } from '@/lib/repositories/project-evaluation.repository';
import type { EvaluationCategory, ProjectEvaluation } from '@/types/evaluation';

export class DatabaseProjectEvaluationRepository
  implements ProjectEvaluationRepository
{
  constructor(private readonly db: Db) {}

  async findByProject(projectId: string): Promise<ProjectEvaluation | null> {
    const rows = await this.db
      .select()
      .from(projectEvaluations)
      .where(eq(projectEvaluations.projectId, projectId))
      .limit(1);
    return rows[0] ? rowToEvaluation(rows[0]) : null;
  }

  async upsert(evaluation: ProjectEvaluation): Promise<ProjectEvaluation> {
    // Atomic insert-or-update keyed on the project_id PK — no read-then-write
    // race. `created_at` is intentionally omitted from the conflict-update
    // set so it is preserved across updates; only `updated_at` advances.
    const row = evaluationToRow(evaluation);
    const [saved] = await this.db
      .insert(projectEvaluations)
      .values(row)
      .onConflictDoUpdate({
        target: projectEvaluations.projectId,
        set: {
          projectName: row.projectName,
          overallScore: row.overallScore,
          maxScore: row.maxScore,
          level: row.level,
          percentage: row.percentage,
          evaluatedBy: row.evaluatedBy,
          evaluatedAt: row.evaluatedAt,
          categories: row.categories,
          recommendation: row.recommendation,
          updatedAt: row.updatedAt,
        },
      })
      .returning();
    return rowToEvaluation(saved);
  }
}

type Row = typeof projectEvaluations.$inferSelect;

function rowToEvaluation(row: Row): ProjectEvaluation {
  return {
    projectId: row.projectId,
    projectName: row.projectName,
    overallScore: row.overallScore,
    maxScore: row.maxScore,
    level: row.level,
    percentage: row.percentage,
    evaluatedBy: row.evaluatedBy,
    evaluatedAt: row.evaluatedAt,
    categories: row.categories as EvaluationCategory[],
    recommendation: row.recommendation,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function evaluationToRow(
  evaluation: ProjectEvaluation,
): typeof projectEvaluations.$inferInsert {
  return {
    projectId: evaluation.projectId,
    projectName: evaluation.projectName,
    overallScore: evaluation.overallScore,
    maxScore: evaluation.maxScore,
    level: evaluation.level,
    percentage: evaluation.percentage,
    evaluatedBy: evaluation.evaluatedBy,
    evaluatedAt: evaluation.evaluatedAt,
    categories: evaluation.categories,
    recommendation: evaluation.recommendation,
    createdAt: evaluation.createdAt,
    updatedAt: evaluation.updatedAt,
  };
}
