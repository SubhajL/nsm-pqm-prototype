export const dynamic = 'force-dynamic';

import { withTransactionalAudit } from '@/lib/audit-helpers';
import {
  canPerformProjectAction,
  forbiddenResponse,
  getCurrentApiUser,
  requireProjectAccess,
} from '@/lib/project-api-access';
import { getRepositories } from '@/lib/repositories';
import { parseRequestBody } from '@/lib/validation';
import type { EngineeringEstimate } from '@/types/engineering-estimate';
import { createEngineeringEstimateRequestSchema } from '@/types/engineering-estimate.schema';

async function resolveProjectId(packageId: string): Promise<string | null> {
  const pkg = await getRepositories().procurementPackages.findById(packageId);
  return pkg?.projectId ?? null;
}

function packageNotFound(packageId: string): Response {
  return Response.json(
    {
      status: 'error',
      error: {
        code: 'NOT_FOUND',
        message: `Procurement package ${packageId} not found`,
      },
    },
    { status: 404 },
  );
}

/**
 * GET /api/engineering-estimates/[packageId] — list estimates for a package.
 */
export async function GET(
  _request: Request,
  { params }: { params: { packageId: string } },
) {
  const projectId = await resolveProjectId(params.packageId);
  if (!projectId) return packageNotFound(params.packageId);

  const forbidden = await requireProjectAccess(projectId);
  if (forbidden) return forbidden;

  const list =
    await getRepositories().engineeringEstimates.listByProcurementPackage(
      params.packageId,
    );
  return Response.json({ status: 'success', data: list });
}

/**
 * POST /api/engineering-estimates/[packageId] — record an engineering estimate.
 *
 * Authz: requires `edit_basic` on the parent project.
 */
export async function POST(
  request: Request,
  { params }: { params: { packageId: string } },
) {
  const rawBody: unknown = await request.json().catch(() => null);
  const parsed = parseRequestBody(
    createEngineeringEstimateRequestSchema,
    rawBody,
  );
  if (!parsed.success) return parsed.response;

  const projectId = await resolveProjectId(params.packageId);
  if (!projectId) return packageNotFound(params.packageId);

  const forbidden = await requireProjectAccess(projectId);
  if (forbidden) return forbidden;

  const currentUser = await getCurrentApiUser();
  if (!(await canPerformProjectAction(currentUser, projectId, 'edit_basic'))) {
    return forbiddenResponse('edit_basic');
  }

  const body = parsed.data;
  const newEstimate: EngineeringEstimate = {
    id: `est-${crypto.randomUUID()}`,
    procurementPackageId: params.packageId,
    boqId: body.boqId ?? null,
    basis: body.basis,
    estimatedTotal: body.estimatedTotal,
    contingencyPercent: body.contingencyPercent,
    estimatedBy: body.estimatedBy.trim(),
    estimatedAt: body.estimatedAt,
    notes: body.notes?.trim() ?? '',
  };

  const created = await withTransactionalAudit(request, async (txRepos, appendAudit) => {
    const result = await txRepos.engineeringEstimates.create(newEstimate);
    await appendAudit({
      action: 'edit_engineering_estimate',
      resourceType: 'engineering_estimate',
      resourceId: result.id,
      projectId,
      before: null,
      after: result,
      decisionReason: `record estimate (${result.basis}, ${result.estimatedTotal} THB)`,
      authorityBasis: 'AUTHZ_MATRIX:edit_basic',
      actor: currentUser,
    });
    return result;
  });

  return Response.json({ status: 'success', data: created }, { status: 201 });
}
