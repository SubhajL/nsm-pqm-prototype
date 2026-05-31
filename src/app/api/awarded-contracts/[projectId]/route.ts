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
import type { AwardedContract } from '@/types/awarded-contract';
import { createAwardedContractRequestSchema } from '@/types/awarded-contract.schema';

/**
 * GET /api/awarded-contracts/[projectId] — list contracts on the project.
 */
export async function GET(
  _request: Request,
  { params }: { params: { projectId: string } },
) {
  const forbidden = await requireProjectAccess(params.projectId);
  if (forbidden) return forbidden;

  const list = await getRepositories().awardedContracts.listByProject(
    params.projectId,
  );
  return Response.json({ status: 'success', data: list });
}

/**
 * POST /api/awarded-contracts/[projectId] — register an awarded contract.
 *
 * Validates the referenced procurement package belongs to the same project
 * (cross-project contracts would let an authorised PM register a contract
 * on a project they can't see). Authz: `edit_basic`.
 */
export async function POST(
  request: Request,
  { params }: { params: { projectId: string } },
) {
  const rawBody: unknown = await request.json().catch(() => null);
  const parsed = parseRequestBody(createAwardedContractRequestSchema, rawBody);
  if (!parsed.success) return parsed.response;

  const forbidden = await requireProjectAccess(params.projectId);
  if (forbidden) return forbidden;

  const currentUser = await getCurrentApiUser();
  if (!(await canPerformProjectAction(currentUser, params.projectId, 'edit_basic'))) {
    return forbiddenResponse('edit_basic');
  }

  const repos = getRepositories();
  const pkg = await repos.procurementPackages.findById(
    parsed.data.procurementPackageId,
  );
  if (!pkg) {
    return Response.json(
      {
        status: 'error',
        error: {
          code: 'NOT_FOUND',
          message: `Procurement package ${parsed.data.procurementPackageId} not found`,
        },
      },
      { status: 404 },
    );
  }
  if (pkg.projectId !== params.projectId) {
    return Response.json(
      {
        status: 'error',
        error: {
          code: 'PROJECT_MISMATCH',
          message: 'Procurement package belongs to a different project',
        },
      },
      { status: 422 },
    );
  }

  const body = parsed.data;
  const newContract: AwardedContract = {
    id: `ct-${crypto.randomUUID()}`,
    procurementPackageId: body.procurementPackageId,
    projectId: params.projectId,
    contractNumber: body.contractNumber.trim(),
    contractorName: body.contractorName.trim(),
    contractorTaxId: body.contractorTaxId ?? null,
    awardAmount: body.awardAmount,
    contractingModel: body.contractingModel,
    state: body.state ?? 'draft',
    signedAt: body.signedAt ?? null,
    effectiveDate: body.effectiveDate ?? null,
    expirationDate: body.expirationDate ?? null,
    warrantyMonths: body.warrantyMonths ?? null,
    notes: body.notes?.trim() ?? '',
  };

  const created = await repos.awardedContracts.create(newContract);
  await recordAuditEvent(request, {
    action: 'edit_awarded_contract',
    resourceType: 'awarded_contract',
    resourceId: created.id,
    projectId: params.projectId,
    before: null,
    after: created,
    decisionReason: `register contract ${created.contractNumber} (${created.contractingModel}/${created.state})`,
    authorityBasis: 'AUTHZ_MATRIX:edit_basic',
    actor: currentUser,
  });

  return Response.json({ status: 'success', data: created }, { status: 201 });
}
