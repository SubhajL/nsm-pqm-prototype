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
import type { HandoverPacket } from '@/types/handover-packet';
import { createHandoverPacketRequestSchema } from '@/types/handover-packet.schema';

/**
 * GET /api/handover-packets/by-project/[projectId]
 *
 * Lists every HandoverPacket on the project. Path uses the
 * `/by-project/` convention from PR-24's procurement routes so the
 * sibling-slug ambiguity (`[projectId]` vs `[packetId]`) at the same
 * depth is avoided.
 */
export async function GET(
  _request: Request,
  { params }: { params: { projectId: string } },
) {
  const forbidden = await requireProjectAccess(params.projectId);
  if (forbidden) return forbidden;

  const list = await getRepositories().handoverPackets.listByProject(
    params.projectId,
  );
  return Response.json({ status: 'success', data: list });
}

/**
 * POST /api/handover-packets/by-project/[projectId]
 *
 * Create a draft HandoverPacket. State is forced to `draft`, all
 * timestamp/identity fields start null. Promotion to subsequent
 * states goes through the transition route.
 *
 * Authz: requires `edit_basic` (System Admin or Project Manager).
 */
export async function POST(
  request: Request,
  { params }: { params: { projectId: string } },
) {
  const rawBody: unknown = await request.json().catch(() => null);
  const parsed = parseRequestBody(createHandoverPacketRequestSchema, rawBody);
  if (!parsed.success) return parsed.response;

  const forbidden = await requireProjectAccess(params.projectId);
  if (forbidden) return forbidden;

  const currentUser = await getCurrentApiUser();
  if (
    !(await canPerformProjectAction(currentUser, params.projectId, 'edit_basic'))
  ) {
    return forbiddenResponse('edit_basic');
  }

  const repos = getRepositories();
  const body = parsed.data;
  const newPacket: HandoverPacket = {
    id: `ho-${crypto.randomUUID()}`,
    projectId: params.projectId,
    contractId: body.contractId ?? null,
    state: 'draft',
    submittedAt: null,
    acceptedAt: null,
    warrantyStartDate: null,
    warrantyEndDate: null,
    acceptedBy: null,
    notes: body.notes?.trim() ?? '',
  };

  const created = await repos.handoverPackets.create(newPacket);
  await recordAuditEvent(request, {
    action: 'create_handover_packet',
    resourceType: 'handover_packet',
    resourceId: created.id,
    projectId: params.projectId,
    before: null,
    after: created,
    decisionReason: `create handover packet (contractId=${created.contractId ?? 'none'})`,
    authorityBasis: 'AUTHZ_MATRIX:edit_basic',
    actor: currentUser,
  });

  return Response.json({ status: 'success', data: created }, { status: 201 });
}
