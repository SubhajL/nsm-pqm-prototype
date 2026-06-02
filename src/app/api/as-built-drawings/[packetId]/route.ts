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
import type { AsBuiltDrawing } from '@/types/as-built-drawing';
import { createAsBuiltDrawingRequestSchema } from '@/types/as-built-drawing.schema';

/**
 * Pre-flight: resolve the handover packet so the route can compose
 * project visibility on top.
 */
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
 * GET /api/as-built-drawings/[packetId] — list every as-built drawing
 * filed for this handover packet. Any project-visible user may read.
 */
export async function GET(
  _request: Request,
  { params }: { params: { packetId: string } },
) {
  const packet = await loadPacket(params.packetId);
  if (!packet) return notFound(params.packetId);

  const forbidden = await requireProjectAccess(packet.projectId);
  if (forbidden) return forbidden;

  const list = await getRepositories().asBuiltDrawings.listByHandoverPacket(
    params.packetId,
  );
  return Response.json({ status: 'success', data: list });
}

/**
 * POST /api/as-built-drawings/[packetId] — add a drawing to the
 * register. Authz: `edit_basic`. `uploadedAt` is filled server-side.
 */
export async function POST(
  request: Request,
  { params }: { params: { packetId: string } },
) {
  const rawBody: unknown = await request.json().catch(() => null);
  const parsed = parseRequestBody(createAsBuiltDrawingRequestSchema, rawBody);
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
  const drawing: AsBuiltDrawing = {
    id: `ab-${crypto.randomUUID()}`,
    handoverPacketId: params.packetId,
    drawingNumber: body.drawingNumber.trim(),
    title: body.title.trim(),
    documentFileId: body.documentFileId ?? null,
    revision: body.revision.trim(),
    uploadedAt: new Date().toISOString(),
    notes: body.notes?.trim() ?? '',
  };

  const created = await withTransactionalAudit(request, async (txRepos, appendAudit) => {
    const result = await txRepos.asBuiltDrawings.create(drawing);
    await appendAudit({
      action: 'create_as_built_drawing',
      resourceType: 'as_built_drawing',
      resourceId: result.id,
      projectId: packet.projectId,
      before: null,
      after: result,
      decisionReason: `register drawing ${result.drawingNumber} (${result.revision})`,
      authorityBasis: 'AUTHZ_MATRIX:edit_basic',
      actor: currentUser,
    });
    return result;
  });

  return Response.json({ status: 'success', data: created }, { status: 201 });
}
