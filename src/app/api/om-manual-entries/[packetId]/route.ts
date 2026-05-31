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
import type { OmManualEntry } from '@/types/om-manual';
import { createOmManualEntryRequestSchema } from '@/types/om-manual.schema';

async function loadPacket(packetId: string) {
  return getRepositories().handoverPackets.findById(packetId);
}

function notFound(packetId: string): Response {
  return Response.json(
    {
      status: 'error',
      error: {
        code: 'NOT_FOUND',
        message: `Handover packet ${packetId} not found`,
      },
    },
    { status: 404 },
  );
}

/**
 * GET /api/om-manual-entries/[packetId] — list every O&M manual entry
 * attached to the handover packet.
 */
export async function GET(
  _request: Request,
  { params }: { params: { packetId: string } },
) {
  const packet = await loadPacket(params.packetId);
  if (!packet) return notFound(params.packetId);

  const forbidden = await requireProjectAccess(packet.projectId);
  if (forbidden) return forbidden;

  const list = await getRepositories().omManualEntries.listByHandoverPacket(
    params.packetId,
  );
  return Response.json({ status: 'success', data: list });
}

/**
 * POST /api/om-manual-entries/[packetId] — attach an O&M manual entry.
 * Authz: `edit_basic`.
 */
export async function POST(
  request: Request,
  { params }: { params: { packetId: string } },
) {
  const rawBody: unknown = await request.json().catch(() => null);
  const parsed = parseRequestBody(createOmManualEntryRequestSchema, rawBody);
  if (!parsed.success) return parsed.response;

  const packet = await loadPacket(params.packetId);
  if (!packet) return notFound(params.packetId);

  const forbidden = await requireProjectAccess(packet.projectId);
  if (forbidden) return forbidden;

  const currentUser = await getCurrentApiUser();
  if (
    !(await canPerformProjectAction(currentUser, packet.projectId, 'edit_basic'))
  ) {
    return forbiddenResponse('edit_basic');
  }

  const repos = getRepositories();
  const body = parsed.data;
  const entry: OmManualEntry = {
    id: `om-${crypto.randomUUID()}`,
    handoverPacketId: params.packetId,
    category: body.category,
    title: body.title.trim(),
    documentFileId: body.documentFileId ?? null,
    notes: body.notes?.trim() ?? '',
  };

  const created = await repos.omManualEntries.create(entry);
  await recordAuditEvent(request, {
    action: 'create_om_manual_entry',
    resourceType: 'om_manual_entry',
    resourceId: created.id,
    projectId: packet.projectId,
    before: null,
    after: created,
    decisionReason: `attach O&M manual entry (${created.category}) "${created.title}"`,
    authorityBasis: 'AUTHZ_MATRIX:edit_basic',
    actor: currentUser,
  });

  return Response.json({ status: 'success', data: created }, { status: 201 });
}
