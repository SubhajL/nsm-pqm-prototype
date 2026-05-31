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
import type { PublicHearing } from '@/types/public-hearing';
import { createPublicHearingRequestSchema } from '@/types/public-hearing.schema';

/**
 * GET /api/public-hearings/[projectId] — list every public-hearing record
 * for the project.
 */
export async function GET(
  _request: Request,
  { params }: { params: { projectId: string } },
) {
  const forbidden = await requireProjectAccess(params.projectId);
  if (forbidden) return forbidden;

  const list = await getRepositories().publicHearings.listByProject(
    params.projectId,
  );
  return Response.json({ status: 'success', data: list });
}

/**
 * POST /api/public-hearings/[projectId] — create a hearing entry.
 *
 * Authz: requires `edit_basic` (System Admin or Project Manager).
 */
export async function POST(
  request: Request,
  { params }: { params: { projectId: string } },
) {
  const rawBody: unknown = await request.json().catch(() => null);
  const parsed = parseRequestBody(createPublicHearingRequestSchema, rawBody);
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
  const newHearing: PublicHearing = {
    id: `ph-${crypto.randomUUID()}`,
    projectId: params.projectId,
    heldAt: body.heldAt,
    location: body.location.trim(),
    attendeeCount: body.attendeeCount,
    summary: body.summary?.trim() ?? '',
    signedMinuteDocId: body.signedMinuteDocId ?? null,
  };

  const created = await repos.publicHearings.create(newHearing);
  await recordAuditEvent(request, {
    action: 'edit_public_hearing',
    resourceType: 'public_hearing',
    resourceId: created.id,
    projectId: params.projectId,
    before: null,
    after: created,
    decisionReason: `create public hearing (${created.heldAt})`,
    authorityBasis: 'AUTHZ_MATRIX:edit_basic',
    actor: currentUser,
  });

  return Response.json({ status: 'success', data: created }, { status: 201 });
}
