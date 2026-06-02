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
import type { ContractorPrequalification } from '@/types/contractor-prequalification';
import { createContractorPrequalificationRequestSchema } from '@/types/contractor-prequalification.schema';

/**
 * GET /api/contractor-prequalifications/[projectId] — list PQ records on
 * the project.
 */
export async function GET(
  _request: Request,
  { params }: { params: { projectId: string } },
) {
  const forbidden = await requireProjectAccess(params.projectId);
  if (forbidden) return forbidden;

  const list =
    await getRepositories().contractorPrequalifications.listByProject(
      params.projectId,
    );
  return Response.json({ status: 'success', data: list });
}

/**
 * POST /api/contractor-prequalifications/[projectId] — record a PQ entry.
 *
 * Authz: requires `edit_basic`. `ahpScore` is nullable until the full AHP
 * scoring module ships.
 */
export async function POST(
  request: Request,
  { params }: { params: { projectId: string } },
) {
  const rawBody: unknown = await request.json().catch(() => null);
  const parsed = parseRequestBody(
    createContractorPrequalificationRequestSchema,
    rawBody,
  );
  if (!parsed.success) return parsed.response;

  const forbidden = await requireProjectAccess(params.projectId);
  if (forbidden) return forbidden;

  const currentUser = await getCurrentApiUser();
  if (!(await canPerformProjectAction(currentUser, params.projectId, 'edit_basic'))) {
    return forbiddenResponse('edit_basic');
  }

  const body = parsed.data;
  const newRecord: ContractorPrequalification = {
    id: `pq-${crypto.randomUUID()}`,
    projectId: params.projectId,
    contractorName: body.contractorName.trim(),
    contractorTaxId: body.contractorTaxId ?? null,
    prequalifiedAt: body.prequalifiedAt,
    validUntil: body.validUntil ?? null,
    ahpScore: body.ahpScore ?? null,
    evidenceDocIds: body.evidenceDocIds ?? [],
    notes: body.notes?.trim() ?? '',
  };

  const created = await withTransactionalAudit(request, async (txRepos, appendAudit) => {
    const result = await txRepos.contractorPrequalifications.create(newRecord);
    await appendAudit({
      action: 'edit_contractor_prequalification',
      resourceType: 'contractor_prequalification',
      resourceId: result.id,
      projectId: params.projectId,
      before: null,
      after: result,
      decisionReason: `record PQ for ${result.contractorName}`,
      authorityBasis: 'AUTHZ_MATRIX:edit_basic',
      actor: currentUser,
    });
    return result;
  });

  return Response.json({ status: 'success', data: created }, { status: 201 });
}
