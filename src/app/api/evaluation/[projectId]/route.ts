export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';

import { withTransactionalAudit } from '@/lib/audit-helpers';
import {
  getCurrentApiUser,
  requireExecutiveUser,
} from '@/lib/project-api-access';
import { getRepositories } from '@/lib/repositories';
import { parseRequestBody } from '@/lib/validation';
import {
  deriveEvaluationSummary,
  EVALUATION_MAX_SCORE,
  type ProjectEvaluation,
} from '@/types/evaluation';
import { upsertEvaluationRequestSchema } from '@/types/evaluation.schema';

/**
 * GET /api/evaluation/[projectId] — read the canonical project evaluation.
 * Executive-only. Repository-backed (replaced the former in-memory store).
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const guard = await requireExecutiveUser();
  if (guard) return guard;

  const { projectId } = await params;
  const evaluation = await getRepositories().projectEvaluations.findByProject(
    projectId,
  );

  if (!evaluation) {
    return NextResponse.json(
      { status: 'error', error: { code: 'NOT_FOUND', message: 'Evaluation not found' } },
      { status: 404 },
    );
  }

  return NextResponse.json({ status: 'success', data: evaluation });
}

/**
 * POST /api/evaluation/[projectId] — create or update the evaluation.
 *
 * Executive-only. The summary (`overallScore` / `percentage` / `level`)
 * is derived server-side from the category scores — the client cannot
 * forge it (the schema is `.strict()`). Audited via the transactional
 * helper; `createdAt` is preserved across updates.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const guard = await requireExecutiveUser();
  if (guard) return guard;

  const { projectId } = await params;

  const rawBody: unknown = await request.json().catch(() => null);
  const parsed = parseRequestBody(upsertEvaluationRequestSchema, rawBody);
  if (!parsed.success) return parsed.response;

  const repos = getRepositories();
  const project = await repos.projects.findById(projectId);
  if (!project) {
    return NextResponse.json(
      {
        status: 'error',
        error: { code: 'NOT_FOUND', message: `Project ${projectId} not found` },
      },
      { status: 404 },
    );
  }

  const body = parsed.data;
  const summary = deriveEvaluationSummary(body.categories, EVALUATION_MAX_SCORE);
  const existing = await repos.projectEvaluations.findByProject(projectId);
  const now = new Date().toISOString();

  const evaluation: ProjectEvaluation = {
    projectId,
    // Server-authoritative: the evaluation's project name always matches
    // the actual project, never a client-supplied value.
    projectName: project.name,
    overallScore: summary.overallScore,
    maxScore: EVALUATION_MAX_SCORE,
    level: summary.level,
    percentage: summary.percentage,
    evaluatedBy: body.evaluatedBy.trim(),
    evaluatedAt: body.evaluatedAt,
    categories: body.categories.map((c) => ({
      name: c.name.trim(),
      nameEn: c.nameEn.trim(),
      score: c.score,
      note: c.note.trim(),
    })),
    recommendation: body.recommendation.trim(),
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };

  const currentUser = await getCurrentApiUser();
  const saved = await withTransactionalAudit(request, async (txRepos, appendAudit) => {
    const result = await txRepos.projectEvaluations.upsert(evaluation);
    await appendAudit({
      action: existing ? 'update_project_evaluation' : 'create_project_evaluation',
      resourceType: 'project_evaluation',
      resourceId: projectId,
      projectId,
      before: existing,
      after: result,
      decisionReason: `${existing ? 'update' : 'create'} evaluation: ${result.percentage}% ${result.level}`,
      authorityBasis: 'ROLE:executive_or_admin',
      actor: currentUser,
    });
    return result;
  });

  return NextResponse.json(
    { status: 'success', data: saved },
    { status: existing ? 200 : 201 },
  );
}
