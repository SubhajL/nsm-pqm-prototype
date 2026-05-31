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
import type { LandAcquisitionRecord } from '@/types/land-acquisition';
import { createLandAcquisitionRequestSchema } from '@/types/land-acquisition.schema';

/**
 * GET /api/land-acquisition/[projectId] — list every land-acquisition
 * parcel record for the project.
 */
export async function GET(
  _request: Request,
  { params }: { params: { projectId: string } },
) {
  const forbidden = await requireProjectAccess(params.projectId);
  if (forbidden) return forbidden;

  const list = await getRepositories().landAcquisitionRecords.listByProject(
    params.projectId,
  );
  return Response.json({ status: 'success', data: list });
}

/**
 * POST /api/land-acquisition/[projectId] — create a parcel record.
 *
 * Authz: requires `edit_basic` (System Admin or Project Manager).
 */
export async function POST(
  request: Request,
  { params }: { params: { projectId: string } },
) {
  const rawBody: unknown = await request.json().catch(() => null);
  const parsed = parseRequestBody(createLandAcquisitionRequestSchema, rawBody);
  if (!parsed.success) return parsed.response;

  const forbidden = await requireProjectAccess(params.projectId);
  if (forbidden) return forbidden;

  const currentUser = await getCurrentApiUser();
  if (
    !(await canPerformProjectAction(
      currentUser,
      params.projectId,
      'edit_basic',
    ))
  ) {
    return forbiddenResponse('edit_basic');
  }

  const repos = getRepositories();
  const body = parsed.data;
  const newRecord: LandAcquisitionRecord = {
    id: `land-${crypto.randomUUID()}`,
    projectId: params.projectId,
    parcelReference: body.parcelReference.trim(),
    landownerName: body.landownerName.trim(),
    areaRai: body.areaRai,
    status: body.status ?? 'identified',
    compensationAmount: body.compensationAmount ?? null,
    notes: body.notes?.trim() ?? '',
  };

  const created = await repos.landAcquisitionRecords.create(newRecord);
  await recordAuditEvent(request, {
    action: 'edit_land_acquisition',
    resourceType: 'land_acquisition_record',
    resourceId: created.id,
    projectId: params.projectId,
    before: null,
    after: created,
    decisionReason: `create land parcel (${created.parcelReference}/${created.status})`,
    authorityBasis: 'AUTHZ_MATRIX:edit_basic',
    actor: currentUser,
  });

  return Response.json({ status: 'success', data: created }, { status: 201 });
}
