export const dynamic = 'force-dynamic';

import { recordAuditEvent } from '@/lib/audit-helpers';
import {
  featureDisabledResponse,
  isFeatureEnabled,
} from '@/lib/feature-flags';
import {
  canPerformProjectAction,
  forbiddenResponse,
  getCurrentApiUser,
  requireProjectAccess,
} from '@/lib/project-api-access';
import { getRepositories } from '@/lib/repositories';
import { parseRequestBody } from '@/lib/validation';
import type { DeliverySlip } from '@/types/delivery-slip';
import { createDeliverySlipRequestSchema } from '@/types/delivery-slip.schema';

const FLAG = 'FEATURE_RID_PAYMENT_FLOW';

/**
 * Pre-flight: resolve the work period and (if found) return its parent
 * projectId so the route can compose project visibility on top.
 */
async function loadWorkPeriod(workPeriodId: string) {
  return getRepositories().workPeriods.findById(workPeriodId);
}

function notFound(workPeriodId: string): Response {
  return Response.json(
    {
      status: 'error',
      error: {
        code: 'NOT_FOUND',
        message: `Work period ${workPeriodId} not found`,
      },
    },
    { status: 404 },
  );
}

/**
 * GET /api/delivery-slips/[workPeriodId] — list every slip attached to
 * the งวดงาน. Any project-visible user may read.
 */
export async function GET(
  _request: Request,
  { params }: { params: { workPeriodId: string } },
) {
  if (!isFeatureEnabled(FLAG)) return featureDisabledResponse(FLAG);

  const wp = await loadWorkPeriod(params.workPeriodId);
  if (!wp) return notFound(params.workPeriodId);

  const forbidden = await requireProjectAccess(wp.projectId);
  if (forbidden) return forbidden;

  const list = await getRepositories().deliverySlips.listByWorkPeriod(
    params.workPeriodId,
  );
  return Response.json({ status: 'success', data: list });
}

/**
 * POST /api/delivery-slips/[workPeriodId] — contractor submits a slip.
 *
 * Authz: requires `edit_basic`. `submittedBy` is taken from the active
 * user (not the wire) so the audit trail is authentic.
 */
export async function POST(
  request: Request,
  { params }: { params: { workPeriodId: string } },
) {
  if (!isFeatureEnabled(FLAG)) return featureDisabledResponse(FLAG);

  const rawBody: unknown = await request.json().catch(() => null);
  const parsed = parseRequestBody(createDeliverySlipRequestSchema, rawBody);
  if (!parsed.success) return parsed.response;

  const wp = await loadWorkPeriod(params.workPeriodId);
  if (!wp) return notFound(params.workPeriodId);

  const forbidden = await requireProjectAccess(wp.projectId);
  if (forbidden) return forbidden;

  const currentUser = await getCurrentApiUser();
  if (!(await canPerformProjectAction(currentUser, wp.projectId, 'edit_basic'))) {
    return forbiddenResponse('edit_basic');
  }

  const repos = getRepositories();
  const body = parsed.data;
  const slip: DeliverySlip = {
    id: `ds-${crypto.randomUUID()}`,
    workPeriodId: params.workPeriodId,
    submittedAt: new Date().toISOString(),
    submittedBy: currentUser?.id ?? '',
    attachedDocIds: body.attachedDocIds,
    notes: body.notes?.trim() ?? '',
  };

  const created = await repos.deliverySlips.create(slip);
  await recordAuditEvent(request, {
    action: 'submit_delivery_slip',
    resourceType: 'delivery_slip',
    resourceId: created.id,
    projectId: wp.projectId,
    before: null,
    after: created,
    decisionReason: `delivery slip for งวดที่ ${wp.number}`,
    authorityBasis: 'AUTHZ_MATRIX:edit_basic',
    actor: currentUser,
  });

  return Response.json({ status: 'success', data: created }, { status: 201 });
}
