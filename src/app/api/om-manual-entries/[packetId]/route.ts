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

  const body = parsed.data;
  const entry: OmManualEntry = {
    id: `om-${crypto.randomUUID()}`,
    handoverPacketId: params.packetId,
    category: body.category,
    title: body.title.trim(),
    documentFileId: body.documentFileId ?? null,
    notes: body.notes?.trim() ?? '',
  };

  const created = await withTransactionalAudit(request, async (txRepos, appendAudit) => {
    const result = await txRepos.omManualEntries.create(entry);
    await appendAudit({
      action: 'create_om_manual_entry',
      resourceType: 'om_manual_entry',
      resourceId: result.id,
      projectId: packet.projectId,
      before: null,
      after: result,
      decisionReason: `attach O&M manual entry (${result.category}) "${result.title}"`,
      authorityBasis: 'AUTHZ_MATRIX:edit_basic',
      actor: currentUser,
    });
    return result;
  });

  return Response.json({ status: 'success', data: created }, { status: 201 });
}
