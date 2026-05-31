export const dynamic = 'force-dynamic';

import { recordAuditEvent } from '@/lib/audit-helpers';
import {
  canPerformProjectAction,
  forbiddenResponse,
  getCurrentApiUser,
  requireProjectAccess,
} from '@/lib/project-api-access';
import { getRepositories } from '@/lib/repositories';
import { requireItProject } from '@/lib/rid/it-project-guard';
import { parseRequestBody } from '@/lib/validation';
import type { VendorSow } from '@/types/vendor-sow';
import { createVendorSowRequestSchema } from '@/types/vendor-sow.schema';

/**
 * GET /api/vendor-sows/by-project/[projectId] — list every SOW on the
 * IT-class project.
 *
 * Gate order: visibility → IT-only check. Returns 422 IT_ONLY_FEATURE
 * when the project exists but isn't `projectClass === 'it'`. Reads are
 * gated by `requireProjectAccess` only — no action-level authz.
 */
export async function GET(
  _request: Request,
  { params }: { params: { projectId: string } },
) {
  const forbidden = await requireProjectAccess(params.projectId);
  if (forbidden) return forbidden;

  const guard = await requireItProject(params.projectId);
  if (!guard.ok) return guard.response;

  const list = await getRepositories().vendorSows.listByProject(
    params.projectId,
  );
  return Response.json({ status: 'success', data: list });
}

/**
 * POST /api/vendor-sows/by-project/[projectId] — register a SOW.
 *
 * Authz: requires `edit_basic`. Returns 422 IT_ONLY_FEATURE when the
 * project isn't IT-class — the gate runs BEFORE the write so no row can
 * land on a non-IT project. Emits `create_vendor_sow` audit event.
 */
export async function POST(
  request: Request,
  { params }: { params: { projectId: string } },
) {
  const rawBody: unknown = await request.json().catch(() => null);
  const parsed = parseRequestBody(createVendorSowRequestSchema, rawBody);
  if (!parsed.success) return parsed.response;

  const forbidden = await requireProjectAccess(params.projectId);
  if (forbidden) return forbidden;

  const currentUser = await getCurrentApiUser();
  if (
    !(await canPerformProjectAction(currentUser, params.projectId, 'edit_basic'))
  ) {
    return forbiddenResponse('edit_basic');
  }

  const guard = await requireItProject(params.projectId);
  if (!guard.ok) return guard.response;

  const repos = getRepositories();
  const body = parsed.data;
  const newSow: VendorSow = {
    id: `sow-${crypto.randomUUID()}`,
    projectId: params.projectId,
    contractId: body.contractId ?? null,
    phase: body.phase.trim(),
    scopeSummary: body.scopeSummary.trim(),
    uatCriteria: body.uatCriteria.trim(),
    warrantyMonths: body.warrantyMonths ?? null,
    state: body.state ?? 'draft',
    signedAt: null,
    acceptedAt: null,
    notes: body.notes?.trim() ?? '',
  };

  const created = await repos.vendorSows.create(newSow);
  await recordAuditEvent(request, {
    action: 'create_vendor_sow',
    resourceType: 'vendor_sow',
    resourceId: created.id,
    projectId: params.projectId,
    before: null,
    after: created,
    decisionReason: `register SOW "${created.phase}" (${created.state})`,
    authorityBasis: 'AUTHZ_MATRIX:edit_basic',
    actor: currentUser,
  });

  return Response.json({ status: 'success', data: created }, { status: 201 });
}
