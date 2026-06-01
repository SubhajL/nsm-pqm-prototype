export const dynamic = 'force-dynamic';

import { recordAuditEvent } from '@/lib/audit-helpers';
import {
  canPerformProjectAction,
  forbiddenResponse,
  getCurrentApiUser,
  requireProjectAccess,
} from '@/lib/project-api-access';
import { canTransitionGate } from '@/lib/rid/quality-gate-state-machine';
import { getRepositories } from '@/lib/repositories';
import { parseRequestBody } from '@/lib/validation';
import { transitionQualityGateRequestSchema } from '@/types/quality.schema';

/**
 * POST /api/quality/gates/[projectId]/transition
 *
 * Body: `{ gateId, toState }`. Advances a single QualityGate through the
 * pure state machine in `src/lib/rid/quality-gate-state-machine.ts`:
 *
 *   - `pending` → `conditional` | `passed`
 *   - `conditional` → `passed`
 *   - `passed` is terminal
 *
 * Auth: project visibility + `edit_quality_inspection`.
 *
 * Returns 404 if the gate is unknown (or belongs to a different project),
 * 409 INVALID_TRANSITION for an illegal state edge,
 * 200 with the updated gate on success.
 */
export async function POST(
  request: Request,
  { params }: { params: { projectId: string } },
) {
  const rawBody: unknown = await request.json().catch(() => null);
  const parsed = parseRequestBody(transitionQualityGateRequestSchema, rawBody);
  if (!parsed.success) return parsed.response;

  const forbidden = await requireProjectAccess(params.projectId);
  if (forbidden) return forbidden;

  const currentUser = await getCurrentApiUser();
  if (
    !(await canPerformProjectAction(
      currentUser,
      params.projectId,
      'edit_quality_inspection',
    ))
  ) {
    return forbiddenResponse('edit_quality_inspection');
  }

  const repos = getRepositories();
  const gate = await repos.qualityGates.findById(parsed.data.gateId);

  if (!gate || gate.projectId !== params.projectId) {
    return Response.json(
      {
        status: 'error',
        error: {
          code: 'NOT_FOUND',
          message: `Quality gate ${parsed.data.gateId} not found for project ${params.projectId}`,
        },
      },
      { status: 404 },
    );
  }

  const check = canTransitionGate(gate.status, parsed.data.toState);
  if (!check.canTransition) {
    return Response.json(
      {
        status: 'error',
        error: {
          code: 'INVALID_TRANSITION',
          message: check.reason ?? 'Transition not allowed',
        },
      },
      { status: 409 },
    );
  }

  const before = gate;
  const updated = await repos.qualityGates.update(gate.id, {
    status: parsed.data.toState,
  });
  if (!updated) {
    return Response.json(
      {
        status: 'error',
        error: {
          code: 'INTERNAL',
          message: 'Update failed unexpectedly',
        },
      },
      { status: 500 },
    );
  }

  await recordAuditEvent(request, {
    action: 'edit_quality_inspection',
    resourceType: 'quality_gate',
    resourceId: gate.id,
    projectId: gate.projectId,
    before,
    after: updated,
    decisionReason: `gate transition ${before.status} -> ${updated.status}`,
    authorityBasis: 'AUTHZ_MATRIX:edit_quality_inspection',
    actor: currentUser,
  });

  return Response.json({ status: 'success', data: updated });
}
