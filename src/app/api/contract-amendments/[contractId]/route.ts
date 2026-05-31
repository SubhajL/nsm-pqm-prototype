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
import type { ContractAmendment } from '@/types/contract-amendment';
import { createContractAmendmentRequestSchema } from '@/types/contract-amendment.schema';

function contractNotFound(contractId: string): Response {
  return Response.json(
    {
      status: 'error',
      error: {
        code: 'NOT_FOUND',
        message: `Contract ${contractId} not found`,
      },
    },
    { status: 404 },
  );
}

/**
 * GET /api/contract-amendments/[contractId] — list amendments for a contract.
 */
export async function GET(
  _request: Request,
  { params }: { params: { contractId: string } },
) {
  const repos = getRepositories();
  const contract = await repos.awardedContracts.findById(params.contractId);
  if (!contract) return contractNotFound(params.contractId);

  const forbidden = await requireProjectAccess(contract.projectId);
  if (forbidden) return forbidden;

  const list = await repos.contractAmendments.listByContract(params.contractId);
  return Response.json({ status: 'success', data: list });
}

/**
 * POST /api/contract-amendments/[contractId] — record an amendment.
 *
 * Authz: requires `edit_basic` on the project that owns the contract.
 */
export async function POST(
  request: Request,
  { params }: { params: { contractId: string } },
) {
  const rawBody: unknown = await request.json().catch(() => null);
  const parsed = parseRequestBody(createContractAmendmentRequestSchema, rawBody);
  if (!parsed.success) return parsed.response;

  const repos = getRepositories();
  const contract = await repos.awardedContracts.findById(params.contractId);
  if (!contract) return contractNotFound(params.contractId);

  const forbidden = await requireProjectAccess(contract.projectId);
  if (forbidden) return forbidden;

  const currentUser = await getCurrentApiUser();
  if (
    !(await canPerformProjectAction(currentUser, contract.projectId, 'edit_basic'))
  ) {
    return forbiddenResponse('edit_basic');
  }

  const body = parsed.data;
  const newAmendment: ContractAmendment = {
    id: `am-${crypto.randomUUID()}`,
    contractId: params.contractId,
    amendmentNumber: body.amendmentNumber,
    amendedAt: body.amendedAt,
    amountDelta: body.amountDelta,
    scheduleDeltaDays: body.scheduleDeltaDays,
    reason: body.reason.trim(),
    approvedBy: body.approvedBy.trim(),
    documentFileId: body.documentFileId ?? null,
  };

  const created = await repos.contractAmendments.create(newAmendment);
  await recordAuditEvent(request, {
    action: 'edit_contract_amendment',
    resourceType: 'contract_amendment',
    resourceId: created.id,
    projectId: contract.projectId,
    before: null,
    after: created,
    decisionReason: `record amendment #${created.amendmentNumber} (${created.amountDelta} THB, ${created.scheduleDeltaDays} days)`,
    authorityBasis: 'AUTHZ_MATRIX:edit_basic',
    actor: currentUser,
  });

  return Response.json({ status: 'success', data: created }, { status: 201 });
}
