export const dynamic = 'force-dynamic';

import { recordAuditEvent } from '@/lib/audit-helpers';
import {
  canPerformProjectAction,
  forbiddenResponse,
  getCurrentApiUser,
  requireProjectAccess,
} from '@/lib/project-api-access';
import { getRepositories } from '@/lib/repositories';
import { canTransitionChangeRequest } from '@/lib/rid/change-request-routing';
import { parseRequestBody } from '@/lib/validation';
import { transitionChangeRequestSchema } from '@/types/change-request.schema';
import type { ChangeRequest } from '@/types/document';

/**
 * PR-27 — Drive the change-request state machine forward.
 *
 * Two-stage gate:
 *   1. `requireProjectAccess` + `approve_change_request` capability (ring A).
 *   2. `canTransitionChangeRequest()` — pure state-machine + role check.
 *      Refusals come back as 403 with the routing helper's reason in
 *      `error.message` so clients get a clear diagnostic.
 *
 * Side effects on success:
 *   - Appends the actor to `approvedByChain` on every non-terminal
 *     forward transition. Rejection leaves the chain unchanged but
 *     stamps `rejectedReason` + `decidedAt`.
 *   - Sets `decidedAt` to the current ISO timestamp on terminal
 *     transitions (`applied`, `rejected`).
 *   - Emits `transition_change_request` audit event with before/after
 *     snapshots and `decisionReason` capturing the from→to + actor.
 */
export async function POST(
  request: Request,
  { params }: { params: { id: string } },
) {
  const repos = getRepositories();
  const cr = await repos.changeRequests.findById(params.id);
  if (!cr) {
    return Response.json(
      {
        status: 'error',
        error: { code: 'NOT_FOUND', message: `Change request ${params.id} not found` },
      },
      { status: 404 },
    );
  }

  const forbidden = await requireProjectAccess(cr.projectId);
  if (forbidden) return forbidden;

  const currentUser = await getCurrentApiUser();
  if (
    !(await canPerformProjectAction(currentUser, cr.projectId, 'approve_change_request'))
  ) {
    return forbiddenResponse('approve_change_request');
  }

  const rawBody: unknown = await request.json().catch(() => null);
  const parsed = parseRequestBody(transitionChangeRequestSchema, rawBody);
  if (!parsed.success) return parsed.response;
  const body = parsed.data;

  // `currentUser` is guaranteed non-null by `canPerformProjectAction`.
  const actor = currentUser!;
  const guard = canTransitionChangeRequest(cr.status, body.toStatus, actor.role);
  if (!guard.ok) {
    return Response.json(
      {
        status: 'error',
        error: { code: 'INVALID_TRANSITION', message: guard.reason },
      },
      { status: 403 },
    );
  }

  // Rejection requires a reason for the audit trail. The schema makes it
  // optional so non-rejection transitions can omit it; we enforce
  // presence here instead of in the schema to keep the field optional
  // for every other transition.
  if (body.toStatus === 'rejected' && !body.reason?.trim()) {
    return Response.json(
      {
        status: 'error',
        error: {
          code: 'VALIDATION_FAILED',
          message: 'reason is required when transitioning to rejected',
        },
      },
      { status: 400 },
    );
  }

  const isTerminal =
    body.toStatus === 'applied' || body.toStatus === 'rejected';

  const patch: Partial<ChangeRequest> = {
    status: body.toStatus,
  };
  if (body.toStatus === 'rejected') {
    patch.rejectedReason = body.reason ?? null;
    patch.decidedAt = new Date().toISOString();
  } else if (body.toStatus === 'applied') {
    patch.decidedAt = new Date().toISOString();
  } else {
    // Forward (non-terminal) transition — append the actor to the chain.
    patch.approvedByChain = [...cr.approvedByChain, actor.id];
  }

  const before = structuredClone(cr);
  const updated = await repos.changeRequests.update(cr.id, patch);

  await recordAuditEvent(request, {
    action: 'transition_change_request',
    resourceType: 'change_request',
    resourceId: cr.id,
    projectId: cr.projectId,
    before,
    after: updated,
    decisionReason: `${cr.status} → ${body.toStatus}${body.reason ? ` (${body.reason})` : ''}`,
    authorityBasis: 'AUTHZ_MATRIX:approve_change_request + change-request-routing',
    actor,
  });

  return Response.json({ status: 'success', data: updated, terminal: isTerminal });
}
