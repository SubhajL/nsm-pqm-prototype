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
import type { ProcurementPackage } from '@/types/procurement-package';
import { createProcurementPackageRequestSchema } from '@/types/procurement-package.schema';

/**
 * GET /api/procurement-packages/by-project/[projectId] — list every procurement
 * package on the project.
 *
 * Auth: any role with project visibility.
 */
export async function GET(
  _request: Request,
  { params }: { params: { projectId: string } },
) {
  const forbidden = await requireProjectAccess(params.projectId);
  if (forbidden) return forbidden;

  const list = await getRepositories().procurementPackages.listByProject(
    params.projectId,
  );
  return Response.json({ status: 'success', data: list });
}

/**
 * POST /api/procurement-packages/by-project/[projectId] — create a new package.
 *
 * Authz: requires `edit_basic` (System Admin or Project Manager). State
 * defaults to `draft`.
 */
export async function POST(
  request: Request,
  { params }: { params: { projectId: string } },
) {
  const rawBody: unknown = await request.json().catch(() => null);
  const parsed = parseRequestBody(createProcurementPackageRequestSchema, rawBody);
  if (!parsed.success) return parsed.response;

  const forbidden = await requireProjectAccess(params.projectId);
  if (forbidden) return forbidden;

  const currentUser = await getCurrentApiUser();
  if (!(await canPerformProjectAction(currentUser, params.projectId, 'edit_basic'))) {
    return forbiddenResponse('edit_basic');
  }

  const body = parsed.data;
  const newPackage: ProcurementPackage = {
    id: `pkg-${crypto.randomUUID()}`,
    projectId: params.projectId,
    name: body.name.trim(),
    state: body.state ?? 'draft',
    budgetCeiling: body.budgetCeiling,
    procurementMethod: body.procurementMethod,
    openedAt: body.openedAt ?? null,
    closedAt: body.closedAt ?? null,
    notes: body.notes?.trim() ?? '',
  };

  const created = await getRepositories().procurementPackages.create(newPackage);
  await recordAuditEvent(request, {
    action: 'edit_procurement_package',
    resourceType: 'procurement_package',
    resourceId: created.id,
    projectId: params.projectId,
    before: null,
    after: created,
    decisionReason: `create procurement package (${created.procurementMethod}/${created.state})`,
    authorityBasis: 'AUTHZ_MATRIX:edit_basic',
    actor: currentUser,
  });

  return Response.json({ status: 'success', data: created }, { status: 201 });
}
