export const dynamic = 'force-dynamic';

import { recordAuditEvent } from '@/lib/audit-helpers';
import {
  canPerformProjectAction,
  forbiddenResponse,
  getCurrentApiUser,
  requireProjectAccess,
} from '@/lib/project-api-access';
import { getRepositories } from '@/lib/repositories';
import { parseRequestBody } from '@/lib/validation';
import type { EnvironmentalAssessment } from '@/types/environmental-assessment';
import { createEnvironmentalAssessmentRequestSchema } from '@/types/environmental-assessment.schema';

/**
 * GET /api/environmental-assessments/[projectId] — list every EIA/IEE/
 * environmental-checklist record on the project.
 */
export async function GET(
  _request: Request,
  { params }: { params: { projectId: string } },
) {
  const forbidden = await requireProjectAccess(params.projectId);
  if (forbidden) return forbidden;

  const list = await getRepositories().environmentalAssessments.listByProject(
    params.projectId,
  );
  return Response.json({ status: 'success', data: list });
}

/**
 * POST /api/environmental-assessments/[projectId] — create an assessment.
 *
 * Authz: requires `edit_basic` (System Admin or Project Manager).
 */
export async function POST(
  request: Request,
  { params }: { params: { projectId: string } },
) {
  const rawBody: unknown = await request.json().catch(() => null);
  const parsed = parseRequestBody(
    createEnvironmentalAssessmentRequestSchema,
    rawBody,
  );
  if (!parsed.success) return parsed.response;

  const forbidden = await requireProjectAccess(params.projectId);
  if (forbidden) return forbidden;

  const currentUser = await getCurrentApiUser();
  if (
    !(await canPerformProjectAction(
      currentUser,
      params.projectId,
      'edit_basic',
    ))
  ) {
    return forbiddenResponse('edit_basic');
  }

  const repos = getRepositories();
  const body = parsed.data;
  const newEia: EnvironmentalAssessment = {
    id: `eia-${crypto.randomUUID()}`,
    projectId: params.projectId,
    kind: body.kind,
    status: body.status ?? 'not_started',
    approvedAt: body.approvedAt ?? null,
    approvalReference: body.approvalReference ?? null,
    notes: body.notes?.trim() ?? '',
  };

  const created = await repos.environmentalAssessments.create(newEia);
  await recordAuditEvent(request, {
    action: 'edit_environmental_assessment',
    resourceType: 'environmental_assessment',
    resourceId: created.id,
    projectId: params.projectId,
    before: null,
    after: created,
    decisionReason: `create assessment (${created.kind}/${created.status})`,
    authorityBasis: 'AUTHZ_MATRIX:edit_basic',
    actor: currentUser,
  });

  return Response.json({ status: 'success', data: created }, { status: 201 });
}
