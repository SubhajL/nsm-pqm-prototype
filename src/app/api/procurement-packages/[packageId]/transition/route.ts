export const dynamic = 'force-dynamic';

import { withTransactionalAudit } from '@/lib/audit-helpers';
import {
  canPerformProjectAction,
  forbiddenResponse,
  getCurrentApiUser,
  requireProjectAccess,
} from '@/lib/project-api-access';
import { canTransitionProcurement } from '@/lib/rid/procurement-helpers';
import { getRepositories } from '@/lib/repositories';
import { parseRequestBody } from '@/lib/validation';
import { transitionProcurementRequestSchema } from '@/types/procurement-package.schema';

/**
 * POST /api/procurement-packages/[packageId]/transition
 *
 * Body: `{ to: ProcurementState }`. Validates the move against
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

  const check = canTransitionProcurement(pkg.state, parsed.data.to);
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

  // Update + audit inside one transaction. If the update returns null
  // (row vanished between findById and update — should not happen in
  // practice, defensive only) we throw to roll back the would-be
  // audit append; the catch maps it to 500.
  const UPDATE_NULL = Symbol('PROC_PKG_UPDATE_RETURNED_NULL');
  const updated = await withTransactionalAudit(request, async (txRepos, appendAudit) => {
    const result = await txRepos.procurementPackages.update(pkg.id, {
      state: parsed.data.to,
    });
    if (!result) {
      throw UPDATE_NULL;
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
    if (err === UPDATE_NULL) return null;
    throw err;
  });

  if (!updated) {
    return Response.json(
      {
        status: 'error',
        error: { code: 'INTERNAL', message: 'Update failed unexpectedly' },
      },
      { status: 500 },
    );
  }

  return Response.json({ status: 'success', data: updated });
}
