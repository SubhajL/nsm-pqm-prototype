export const dynamic = 'force-dynamic';

import { withTransactionalAudit } from '@/lib/audit-helpers';
import {
  canPerformProjectAction,
  forbiddenResponse,
  getCurrentApiUser,
  requireProjectAccess,
} from '@/lib/project-api-access';
import { canTransitionProcurement } from '@/lib/rid/procurement-helpers';
import { STATE_CONFLICT, stateConflictResponse } from '@/lib/state-conflict';
import { getRepositories } from '@/lib/repositories';
import { parseRequestBody } from '@/lib/validation';
import { transitionProcurementRequestSchema } from '@/types/procurement-package.schema';

/**
 * POST /api/procurement-packages/[packageId]/transition
 *
 * Body: `{ targetState: ProcurementState }` (legacy `{ to }` accepted). Validates the move against
 * `canTransitionProcurement()` and rejects with 422 INVALID_TRANSITION on
 * illegal edges.
 *
 * Auth: requires project visibility on the package's project AND
 * `edit_basic` capability.
 */
export async function POST(
  request: Request,
  { params }: { params: { packageId: string } },
) {
  const rawBody: unknown = await request.json().catch(() => null);
  const parsed = parseRequestBody(transitionProcurementRequestSchema, rawBody);
  if (!parsed.success) return parsed.response;

  const repos = getRepositories();
  const pkg = await repos.procurementPackages.findById(params.packageId);
  if (!pkg) {
    return Response.json(
      {
        status: 'error',
        error: {
          code: 'NOT_FOUND',
          message: `Procurement package ${params.packageId} not found`,
        },
      },
      { status: 404 },
    );
  }

  const forbidden = await requireProjectAccess(pkg.projectId);
  if (forbidden) return forbidden;

  const currentUser = await getCurrentApiUser();
  if (!(await canPerformProjectAction(currentUser, pkg.projectId, 'edit_basic'))) {
    return forbiddenResponse('edit_basic');
  }

  const check = canTransitionProcurement(pkg.state, parsed.data.targetState);
  if (!check.ok) {
    return Response.json(
      {
        status: 'error',
        error: { code: 'INVALID_TRANSITION', message: check.reason },
      },
      { status: 422 },
    );
  }

  const before = pkg;

  // PR-34 — compare-and-swap inside the transaction: the UPDATE only
  // matches while the package is still in the pre-checked state. A
  // concurrent transition makes it match zero rows; we throw to roll
  // back the would-be audit append and answer 409 STATE_CONFLICT.
  const updated = await withTransactionalAudit(request, async (txRepos, appendAudit) => {
    const result = await txRepos.procurementPackages.updateIfState(pkg.id, before.state, {
      state: parsed.data.targetState,
    });
    if (!result) {
      throw STATE_CONFLICT;
    }
    await appendAudit({
      action: 'transition_procurement_package',
      resourceType: 'procurement_package',
      resourceId: pkg.id,
      projectId: pkg.projectId,
      before,
      after: result,
      decisionReason: `transition ${before.state} -> ${result.state}`,
      authorityBasis: 'AUTHZ_MATRIX:edit_basic',
      actor: currentUser,
    });
    return result;
  }).catch((err: unknown) => {
    if (err === STATE_CONFLICT) return null;
    throw err;
  });

  if (!updated) {
    return stateConflictResponse('ชุดจัดซื้อ (Procurement package)');
  }

  return Response.json({ status: 'success', data: updated });
}
