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
import type { Permit } from '@/types/permit';
import { createPermitRequestSchema } from '@/types/permit.schema';

/**
 * GET /api/permits/[projectId] — list every permit on the project.
 *
 * Auth: requires project visibility (`requireProjectAccess`). Any visible
 * role can read the register; mutations are gated separately on POST.
 */
export async function GET(
  _request: Request,
  { params }: { params: { projectId: string } },
) {
  const forbidden = await requireProjectAccess(params.projectId);
  if (forbidden) return forbidden;

  const list = await getRepositories().permits.listByProject(params.projectId);
  return Response.json({ status: 'success', data: list });
}

/**
 * POST /api/permits/[projectId] — create a permit in the register.
 *
 * Authz: requires `edit_basic` (System Admin or Project Manager) — this
 * is a compliance write that should not be left to read-only roles.
 *
 * Audit: emits `edit_permit` after the row lands. Status defaults to
 * `draft` when omitted.
 */
export async function POST(
  request: Request,
  { params }: { params: { projectId: string } },
) {
  const rawBody: unknown = await request.json().catch(() => null);
  const parsed = parseRequestBody(createPermitRequestSchema, rawBody);
  if (!parsed.success) return parsed.response;

  const forbidden = await requireProjectAccess(params.projectId);
  if (forbidden) return forbidden;

  const currentUser = await getCurrentApiUser();
  if (!(await canPerformProjectAction(currentUser, params.projectId, 'edit_basic'))) {
    return forbiddenResponse('edit_basic');
  }

  const repos = getRepositories();
  const body = parsed.data;
  const newPermit: Permit = {
    id: `per-${crypto.randomUUID()}`,
    projectId: params.projectId,
    permitType: body.permitType.trim(),
    title: body.title.trim(),
    issuingAuthority: body.issuingAuthority.trim(),
    status: body.status ?? 'draft',
    issuedAt: body.issuedAt ?? null,
    expiresAt: body.expiresAt ?? null,
    notes: body.notes?.trim() ?? '',
  };

  const created = await repos.permits.create(newPermit);
  await recordAuditEvent(request, {
    action: 'edit_permit',
    resourceType: 'permit',
    resourceId: created.id,
    projectId: params.projectId,
    before: null,
    after: created,
    decisionReason: `create permit (${created.permitType}/${created.status})`,
    authorityBasis: 'AUTHZ_MATRIX:edit_basic',
    actor: currentUser,
  });

  return Response.json({ status: 'success', data: created }, { status: 201 });
}
