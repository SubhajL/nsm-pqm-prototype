export const dynamic = 'force-dynamic';

import { recordAuditEvent } from '@/lib/audit-helpers';
import {
  canPerformProjectAction,
  forbiddenResponse,
  getCurrentApiUser,
  requireProjectAccess,
} from '@/lib/project-api-access';
import { getRepositories } from '@/lib/repositories';
import { requireItProject } from '@/lib/rid/it-project-guard';
import { parseRequestBody } from '@/lib/validation';
import type { ItSprint } from '@/types/sprint';
import { createItSprintRequestSchema } from '@/types/sprint.schema';

/**
 * GET /api/it-sprints/by-project/[projectId] — list sprints on the IT project.
 *
 * Returns 422 IT_ONLY_FEATURE for non-IT projects.
 */
export async function GET(
  _request: Request,
  { params }: { params: { projectId: string } },
) {
  const forbidden = await requireProjectAccess(params.projectId);
  if (forbidden) return forbidden;

  const guard = await requireItProject(params.projectId);
  if (!guard.ok) return guard.response;

  const list = await getRepositories().itSprints.listByProject(
    params.projectId,
  );
  return Response.json({ status: 'success', data: list });
}

/**
 * POST /api/it-sprints/by-project/[projectId] — create a sprint.
 *
 * Authz: `edit_basic`. Returns 422 IT_ONLY_FEATURE for non-IT projects.
 * Defaults `lifecycleStage` to the project's current stage if omitted.
 */
export async function POST(
  request: Request,
  { params }: { params: { projectId: string } },
) {
  const rawBody: unknown = await request.json().catch(() => null);
  const parsed = parseRequestBody(createItSprintRequestSchema, rawBody);
  if (!parsed.success) return parsed.response;

  const forbidden = await requireProjectAccess(params.projectId);
  if (forbidden) return forbidden;

  const currentUser = await getCurrentApiUser();
  if (
    !(await canPerformProjectAction(currentUser, params.projectId, 'edit_basic'))
  ) {
    return forbiddenResponse('edit_basic');
  }

  const guard = await requireItProject(params.projectId);
  if (!guard.ok) return guard.response;

  const repos = getRepositories();
  const body = parsed.data;
  const newSprint: ItSprint = {
    id: `sp-${crypto.randomUUID()}`,
    projectId: params.projectId,
    lifecycleStage: body.lifecycleStage ?? guard.project.currentLifecycleStage,
    sprintNumber: body.sprintNumber,
    startDate: body.startDate,
    endDate: body.endDate,
    goal: body.goal.trim(),
    velocityPoints: body.velocityPoints,
    completedPoints: body.completedPoints ?? 0,
    notes: body.notes?.trim() ?? '',
  };

  const created = await repos.itSprints.create(newSprint);
  await recordAuditEvent(request, {
    action: 'create_it_sprint',
    resourceType: 'it_sprint',
    resourceId: created.id,
    projectId: params.projectId,
    before: null,
    after: created,
    decisionReason: `create Sprint #${created.sprintNumber} (${created.lifecycleStage})`,
    authorityBasis: 'AUTHZ_MATRIX:edit_basic',
    actor: currentUser,
  });

  return Response.json({ status: 'success', data: created }, { status: 201 });
}
