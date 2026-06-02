export const dynamic = 'force-dynamic';

import { withTransactionalAudit } from '@/lib/audit-helpers';
import {
  canPerformProjectAction,
  forbiddenResponse,
  getCurrentApiUser,
  requireProjectAccess,
} from '@/lib/project-api-access';
import { getRepositories } from '@/lib/repositories';
import { canTransitionSow } from '@/lib/rid/it-class-helpers';
import { requireItProject } from '@/lib/rid/it-project-guard';
import { parseRequestBody } from '@/lib/validation';
import { transitionVendorSowRequestSchema } from '@/types/vendor-sow.schema';

/**
 * POST /api/vendor-sows/[sowId]/transition — advance a SOW state.
 *
 * Decision pipeline:
 *   1. Zod body shape — 400 on malformed input.
 *   2. SOW lookup — 404 if unknown.
 *   3. Project visibility + `edit_basic` authz — 401/403 if blocked.
 *   4. IT-only guard — 422 IT_ONLY_FEATURE on non-IT projects.
 *   5. Pure state machine — 409 STATE_TRANSITION_REJECTED on illegal moves.
 *   6. Stamp `signedAt` on `agreed`, `acceptedAt` on `accepted`. Persist.
 *   7. Audit event.
 */
export async function POST(
  request: Request,
  { params }: { params: { sowId: string } },
) {
  const rawBody: unknown = await request.json().catch(() => null);
  const parsed = parseRequestBody(transitionVendorSowRequestSchema, rawBody);
  if (!parsed.success) return parsed.response;

  const repos = getRepositories();
  const sow = await repos.vendorSows.findById(params.sowId);
  if (!sow) {
    return Response.json(
      {
        status: 'error',
        error: {
          code: 'NOT_FOUND',
          message: `Vendor SOW ${params.sowId} not found`,
        },
      },
      { status: 404 },
    );
  }

  const forbidden = await requireProjectAccess(sow.projectId);
  if (forbidden) return forbidden;

  const currentUser = await getCurrentApiUser();
  if (
    !(await canPerformProjectAction(currentUser, sow.projectId, 'edit_basic'))
  ) {
    return forbiddenResponse('edit_basic');
  }

  const guard = await requireItProject(sow.projectId);
  if (!guard.ok) return guard.response;

  const decision = canTransitionSow(sow.state, parsed.data.targetState);
  if (!decision.ok) {
    return Response.json(
      {
        status: 'error',
        error: {
          code: 'STATE_TRANSITION_REJECTED',
          message: `Transition "${sow.state}" → "${parsed.data.targetState}" is not allowed.`,
          reason: decision.reason,
        },
      },
      { status: 409 },
    );
  }

  const now = new Date().toISOString();
  const before = {
    state: sow.state,
    signedAt: sow.signedAt,
    acceptedAt: sow.acceptedAt,
  };

  // Stamp signedAt at the agreed transition; acceptedAt at accepted.
  // Other transitions leave the stamps alone.
  const patch: { state: typeof parsed.data.targetState; signedAt?: string; acceptedAt?: string } = {
    state: parsed.data.targetState,
  };
  if (parsed.data.targetState === 'agreed' && sow.signedAt === null) {
    patch.signedAt = now;
  }
  if (parsed.data.targetState === 'accepted' && sow.acceptedAt === null) {
    patch.acceptedAt = now;
  }

  const updated = await withTransactionalAudit(request, async (txRepos, appendAudit) => {
    const result = await txRepos.vendorSows.update(sow.id, patch);
    await appendAudit({
      action: 'transition_vendor_sow',
      resourceType: 'vendor_sow',
      resourceId: sow.id,
      projectId: sow.projectId,
      before,
      after: {
        state: result?.state,
        signedAt: result?.signedAt,
        acceptedAt: result?.acceptedAt,
      },
      decisionReason: `SOW "${sow.phase}": ${sow.state} → ${parsed.data.targetState}`,
      authorityBasis: 'AUTHZ_MATRIX:edit_basic',
      actor: currentUser,
    });
    return result;
  });

  return Response.json({ status: 'success', data: updated ?? sow });
}
