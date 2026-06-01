export const dynamic = 'force-dynamic';

import { recordAuditEvent } from '@/lib/audit-helpers';
import {
  canPerformProjectAction,
  forbiddenResponse,
  getCurrentApiUser,
  requireProjectAccess,
} from '@/lib/project-api-access';
import { getRepositories } from '@/lib/repositories';
import { applyMitigatingRiskIssues } from '@/lib/risk-issue-consistency';
import { parseRequestBody } from '@/lib/validation';
import type { Risk } from '@/types/risk';
import {
  createRiskRequestSchema,
  deleteRiskRequestSchema,
  updateRiskRequestSchema,
} from '@/types/risk.schema';

export async function GET(
  request: Request,
  { params }: { params: { projectId: string } },
) {
  await new Promise((resolve) => setTimeout(resolve, 150));
  const store = await getRepositories().risks.list();
  const forbidden = await requireProjectAccess(params.projectId);
  if (forbidden) return forbidden;

  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');

  let filtered = store.filter((r) => r.projectId === params.projectId);

  if (status) {
    filtered = filtered.filter((r) => r.status === status);
  }

  return Response.json({ status: 'success', data: filtered });
}

export async function POST(
  request: Request,
  { params }: { params: { projectId: string } },
) {
  await new Promise((resolve) => setTimeout(resolve, 150));
  const repos = getRepositories();
  const store = await repos.risks.list();
  const issueStore = await repos.issues.list();

  const rawBody: unknown = await request.json().catch(() => null);
  const parsed = parseRequestBody(createRiskRequestSchema, rawBody);
  if (!parsed.success) return parsed.response;
  const body = parsed.data;

  const forbidden = await requireProjectAccess(params.projectId);
  if (forbidden) return forbidden;

  if (!(await canPerformProjectAction(await getCurrentApiUser(), params.projectId, 'edit_risk'))) {
    return forbiddenResponse('edit_risk');
  }

  const likelihood = Number(body.likelihood ?? 1);
  const impact = Number(body.impact ?? 1);
  const score = likelihood * impact;
  const level: Risk['level'] =
    score >= 16 ? 'critical' : score >= 10 ? 'high' : score >= 5 ? 'medium' : 'low';

  const newRisk: Risk = {
    id: `R-${String(store.length + 1).padStart(3, '0')}`,
    projectId: params.projectId,
    title: body.title.trim(),
    description: body.description?.trim() || '',
    likelihood,
    impact,
    score,
    level,
    status: body.status ?? 'open',
    owner: body.owner.trim(),
    dateIdentified: body.dateIdentified ?? new Date().toISOString().split('T')[0],
    mitigation: body.mitigation?.trim() || '',
  };

  await repos.risks.create(newRisk);
  // Apply auto-created mitigation issues + updates via the repo so DB
  // backend sees the writes (replaces the old in-place `issueStore.push`
  // pattern that only worked under InMemory).
  await applyMitigatingRiskIssues(repos, issueStore, [newRisk]);
  await recordAuditEvent(request, {
    action: 'edit_risk',
    resourceType: 'risk',
    resourceId: newRisk.id,
    projectId: params.projectId,
    before: null,
    after: newRisk,
    decisionReason: `create (level=${newRisk.level}, score=${newRisk.score})`,
    authorityBasis: 'AUTHZ_MATRIX:edit_risk',
  });

  return Response.json({ status: 'success', data: newRisk }, { status: 201 });
}

/**
 * PR-L — PATCH a risk's editable fields. When `likelihood` or `impact`
 * change, the route re-derives `score` (likelihood × impact) and `level`
 * band so the displayed risk colour stays consistent with the inputs.
 */
export async function PATCH(
  request: Request,
  { params }: { params: { projectId: string } },
) {
  await new Promise((resolve) => setTimeout(resolve, 150));
  const repos = getRepositories();

  const rawBody: unknown = await request.json().catch(() => null);
  const parsed = parseRequestBody(updateRiskRequestSchema, rawBody);
  if (!parsed.success) return parsed.response;
  const body = parsed.data;

  const forbidden = await requireProjectAccess(params.projectId);
  if (forbidden) return forbidden;

  if (!(await canPerformProjectAction(await getCurrentApiUser(), params.projectId, 'edit_risk'))) {
    return forbiddenResponse('edit_risk');
  }

  const existing = await repos.risks.findById(body.id);
  if (!existing || existing.projectId !== params.projectId) {
    return Response.json(
      { status: 'error', error: { code: 'NOT_FOUND', message: 'Risk not found' } },
      { status: 404 },
    );
  }

  const before = { ...existing };
  const nextLikelihood = body.likelihood ?? existing.likelihood;
  const nextImpact = body.impact ?? existing.impact;
  const recomputeBand =
    body.likelihood !== undefined || body.impact !== undefined;
  const nextScore = recomputeBand ? nextLikelihood * nextImpact : existing.score;
  const nextLevel: Risk['level'] = recomputeBand
    ? nextScore >= 16
      ? 'critical'
      : nextScore >= 10
        ? 'high'
        : nextScore >= 5
          ? 'medium'
          : 'low'
    : existing.level;

  const patch: Partial<Risk> = {
    title: body.title !== undefined ? body.title.trim() : existing.title,
    description: body.description !== undefined ? body.description.trim() : existing.description,
    likelihood: nextLikelihood,
    impact: nextImpact,
    score: nextScore,
    level: nextLevel,
    status: body.status ?? existing.status,
    owner: body.owner !== undefined ? body.owner.trim() : existing.owner,
    mitigation: body.mitigation !== undefined ? body.mitigation.trim() : existing.mitigation,
  };

  const updated = await repos.risks.update(body.id, patch);
  if (!updated) {
    return Response.json(
      { status: 'error', error: { code: 'NOT_FOUND', message: 'Risk not found' } },
      { status: 404 },
    );
  }

  await recordAuditEvent(request, {
    action: 'edit_risk',
    resourceType: 'risk',
    resourceId: updated.id,
    projectId: params.projectId,
    before,
    after: updated,
    decisionReason: `update (level=${updated.level}, score=${updated.score})`,
    authorityBasis: 'AUTHZ_MATRIX:edit_risk',
  });

  return Response.json({ status: 'success', data: updated });
}

/**
 * PR-L — DELETE a risk. Auto-created mitigation issues (with
 * `sourceRiskId === risk.id`) are intentionally LEFT in place — closing
 * a risk record doesn't mean the issue it generated has been resolved.
 */
export async function DELETE(
  request: Request,
  { params }: { params: { projectId: string } },
) {
  await new Promise((resolve) => setTimeout(resolve, 150));
  const repos = getRepositories();

  const rawBody: unknown = await request.json().catch(() => null);
  const parsed = parseRequestBody(deleteRiskRequestSchema, rawBody);
  if (!parsed.success) return parsed.response;
  const { id } = parsed.data;

  const forbidden = await requireProjectAccess(params.projectId);
  if (forbidden) return forbidden;

  if (!(await canPerformProjectAction(await getCurrentApiUser(), params.projectId, 'edit_risk'))) {
    return forbiddenResponse('edit_risk');
  }

  const existing = await repos.risks.findById(id);
  if (!existing || existing.projectId !== params.projectId) {
    return Response.json(
      { status: 'error', error: { code: 'NOT_FOUND', message: 'Risk not found' } },
      { status: 404 },
    );
  }

  await repos.risks.delete(id);
  await recordAuditEvent(request, {
    action: 'edit_risk',
    resourceType: 'risk',
    resourceId: existing.id,
    projectId: params.projectId,
    before: existing,
    after: null,
    decisionReason: 'delete',
    authorityBasis: 'AUTHZ_MATRIX:edit_risk',
  });

  return Response.json({ status: 'success', data: existing });
}
