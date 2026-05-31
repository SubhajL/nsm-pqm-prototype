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
import type { CommitteeInspection } from '@/types/committee-inspection';
import { createCommitteeInspectionRequestSchema } from '@/types/committee-inspection.schema';

const FLAG = 'FEATURE_RID_PAYMENT_FLOW';

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
 * GET /api/committee-inspections/[workPeriodId] — list every committee
 * inspection record attached to the งวดงาน. Any project-visible user
 * may read; mutations require `edit_basic`.
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

  const list =
    await getRepositories().committeeInspections.listByWorkPeriod(
      params.workPeriodId,
    );
  return Response.json({ status: 'success', data: list });
}

/**
 * POST /api/committee-inspections/[workPeriodId] — record a committee
 * inspection result. Does NOT auto-transition the parent work period —
 * the caller follows up with the transition route for that.
 */
export async function POST(
  request: Request,
  { params }: { params: { workPeriodId: string } },
) {
  if (!isFeatureEnabled(FLAG)) return featureDisabledResponse(FLAG);

  const rawBody: unknown = await request.json().catch(() => null);
  const parsed = parseRequestBody(
    createCommitteeInspectionRequestSchema,
    rawBody,
  );
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
  const insp: CommitteeInspection = {
    id: `ci-${crypto.randomUUID()}`,
    workPeriodId: params.workPeriodId,
    inspectedAt: new Date().toISOString(),
    inspectors: body.inspectors,
    result: body.result,
    conditions: body.conditions?.trim() ?? '',
    documentIds: body.documentIds,
  };

  const created = await repos.committeeInspections.create(insp);
  await recordAuditEvent(request, {
    action: 'record_committee_inspection',
    resourceType: 'committee_inspection',
    resourceId: created.id,
    projectId: wp.projectId,
    before: null,
    after: created,
    decisionReason: `committee inspection for งวดที่ ${wp.number}: ${created.result}`,
    authorityBasis: 'AUTHZ_MATRIX:edit_basic',
    actor: currentUser,
  });

  return Response.json({ status: 'success', data: created }, { status: 201 });
}
