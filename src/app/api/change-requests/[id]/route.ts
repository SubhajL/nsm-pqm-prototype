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
import { patchChangeRequestImpactSchema } from '@/types/change-request.schema';

/**
 * PR-27 — Per-CR detail + impact-analysis update.
 *
 * GET returns the CR if the caller has project visibility. PATCH lets
 * the caller refine the impact-analysis fields (schedule/budget/scope
 * deltas) without moving the workflow state — the state machine is
 * driven by the sibling `/transition` route.
 *
 * Authz on PATCH: `submit_change_request` — the same capability that
 * lets a user file a CR also lets them refine its impact analysis.
 * Approval / rejection lives on the transition route.
 */
export async function GET(
  _request: Request,
  { params }: { params: { id: string } },
) {
  const cr = await getRepositories().changeRequests.findById(params.id);
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

  return Response.json({ status: 'success', data: cr });
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } },
) {
  const cr = await getRepositories().changeRequests.findById(params.id);
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
    !(await canPerformProjectAction(currentUser, cr.projectId, 'submit_change_request'))
  ) {
    return forbiddenResponse('submit_change_request');
  }

  const rawBody: unknown = await request.json().catch(() => null);
  const parsed = parseRequestBody(patchChangeRequestImpactSchema, rawBody);
  if (!parsed.success) return parsed.response;
  const body = parsed.data;

  const before = structuredClone(cr);
  const updated = await getRepositories().changeRequests.update(params.id, {
    impactScheduleDays:
      body.impactScheduleDays ?? cr.impactScheduleDays,
    impactBudgetTHB: body.impactBudgetTHB ?? cr.impactBudgetTHB,
    impactScope: body.impactScope ?? cr.impactScope,
  });

  await recordAuditEvent(request, {
    action: 'edit_change_request_impact',
    resourceType: 'change_request',
    resourceId: cr.id,
    projectId: cr.projectId,
    before,
    after: updated,
    decisionReason: 'updated impact analysis',
    authorityBasis: 'AUTHZ_MATRIX:submit_change_request',
    actor: currentUser,
  });

  return Response.json({ status: 'success', data: updated });
}
