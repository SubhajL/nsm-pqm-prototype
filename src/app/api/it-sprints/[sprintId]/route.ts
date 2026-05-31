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
import { updateItSprintRequestSchema } from '@/types/sprint.schema';

/**
 * PATCH /api/it-sprints/[sprintId] — update velocity / notes on a sprint.
 *
 * Decision pipeline:
 *   1. Zod body shape — 400 (must include at least one field).
 *   2. Sprint lookup — 404 if unknown.
 *   3. Project visibility + `edit_basic` authz — 401/403.
 *   4. IT-only guard — 422 IT_ONLY_FEATURE on non-IT projects.
 *   5. Persist patch + audit event.
 */
export async function PATCH(
  request: Request,
  { params }: { params: { sprintId: string } },
) {
  const rawBody: unknown = await request.json().catch(() => null);
  const parsed = parseRequestBody(updateItSprintRequestSchema, rawBody);
  if (!parsed.success) return parsed.response;

  const repos = getRepositories();
  const sprint = await repos.itSprints.findById(params.sprintId);
  if (!sprint) {
    return Response.json(
      {
        status: 'error',
        error: {
          code: 'NOT_FOUND',
          message: `IT sprint ${params.sprintId} not found`,
        },
      },
      { status: 404 },
    );
  }

  const forbidden = await requireProjectAccess(sprint.projectId);
  if (forbidden) return forbidden;

  const currentUser = await getCurrentApiUser();
  if (
    !(await canPerformProjectAction(currentUser, sprint.projectId, 'edit_basic'))
  ) {
    return forbiddenResponse('edit_basic');
  }

  const guard = await requireItProject(sprint.projectId);
  if (!guard.ok) return guard.response;

  const before = {
    velocityPoints: sprint.velocityPoints,
    completedPoints: sprint.completedPoints,
    goal: sprint.goal,
    notes: sprint.notes,
  };
  const updated = await repos.itSprints.update(sprint.id, parsed.data);

  await recordAuditEvent(request, {
    action: 'update_it_sprint',
    resourceType: 'it_sprint',
    resourceId: sprint.id,
    projectId: sprint.projectId,
    before,
    after: {
      velocityPoints: updated?.velocityPoints,
      completedPoints: updated?.completedPoints,
      goal: updated?.goal,
      notes: updated?.notes,
    },
    decisionReason: `update Sprint #${sprint.sprintNumber} (velocity ${before.velocityPoints} → ${updated?.velocityPoints})`,
    authorityBasis: 'AUTHZ_MATRIX:edit_basic',
    actor: currentUser,
  });

  return Response.json({ status: 'success', data: updated ?? sprint });
}
