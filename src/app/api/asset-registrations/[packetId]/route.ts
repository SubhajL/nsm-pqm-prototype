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
import type { AssetRegistration } from '@/types/asset-registration';
import { createAssetRegistrationRequestSchema } from '@/types/asset-registration.schema';

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
 * GET /api/asset-registrations/[packetId] — list every asset
 * registration row attached to the handover packet.
 */
export async function GET(
  _request: Request,
  { params }: { params: { packetId: string } },
) {
  const packet = await loadPacket(params.packetId);
  if (!packet) return notFound(params.packetId);

  const forbidden = await requireProjectAccess(packet.projectId);
  if (forbidden) return forbidden;

  const list = await getRepositories().assetRegistrations.listByHandoverPacket(
    params.packetId,
  );
  return Response.json({ status: 'success', data: list });
}

/**
 * POST /api/asset-registrations/[packetId] — register an asset against
 * the handover packet. Authz: `edit_basic`.
 */
export async function POST(
  request: Request,
  { params }: { params: { packetId: string } },
) {
  const rawBody: unknown = await request.json().catch(() => null);
  const parsed = parseRequestBody(createAssetRegistrationRequestSchema, rawBody);
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
  const registration: AssetRegistration = {
    id: `ar-${crypto.randomUUID()}`,
    handoverPacketId: params.packetId,
    assetCode: body.assetCode.trim(),
    assetType: body.assetType,
    installedAt: body.installedAt,
    installedLocation: body.installedLocation.trim(),
    initialValue: body.initialValue,
    costCenter: body.costCenter ?? null,
    notes: body.notes?.trim() ?? '',
  };

  const created = await repos.assetRegistrations.create(registration);
  await recordAuditEvent(request, {
    action: 'create_asset_registration',
    resourceType: 'asset_registration',
    resourceId: created.id,
    projectId: packet.projectId,
    before: null,
    after: created,
    decisionReason: `register asset ${created.assetCode} (${created.assetType}) @ ${created.installedLocation}`,
    authorityBasis: 'AUTHZ_MATRIX:edit_basic',
    actor: currentUser,
  });

  return Response.json({ status: 'success', data: created }, { status: 201 });
}
