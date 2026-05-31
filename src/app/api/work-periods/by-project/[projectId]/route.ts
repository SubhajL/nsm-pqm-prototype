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
import type { WorkPeriod } from '@/types/work-period';
import { createWorkPeriodRequestSchema } from '@/types/work-period.schema';

const FLAG = 'FEATURE_RID_PAYMENT_FLOW';

/**
 * GET /api/work-periods/[projectId] — list every งวดงาน on the project.
 *
 * Gate order: feature flag → project visibility. Mutations are gated by
 * `edit_basic` (System Admin or Project Manager) on POST below.
 */
export async function GET(
  _request: Request,
  { params }: { params: { projectId: string } },
) {
  if (!isFeatureEnabled(FLAG)) return featureDisabledResponse(FLAG);

  const forbidden = await requireProjectAccess(params.projectId);
  if (forbidden) return forbidden;

  const list = await getRepositories().workPeriods.listByProject(
    params.projectId,
  );
  return Response.json({ status: 'success', data: list });
}

/**
 * POST /api/work-periods/[projectId] — create a งวดงาน.
 *
 * Authz: requires `edit_basic` (System Admin or Project Manager).
 * Audit: emits `create_work_period` after the row lands. State defaults
 * to `planned` when omitted.
 */
export async function POST(
  request: Request,
  { params }: { params: { projectId: string } },
) {
  if (!isFeatureEnabled(FLAG)) return featureDisabledResponse(FLAG);

  const rawBody: unknown = await request.json().catch(() => null);
  const parsed = parseRequestBody(createWorkPeriodRequestSchema, rawBody);
  if (!parsed.success) return parsed.response;

  const forbidden = await requireProjectAccess(params.projectId);
  if (forbidden) return forbidden;

  const currentUser = await getCurrentApiUser();
  if (!(await canPerformProjectAction(currentUser, params.projectId, 'edit_basic'))) {
    return forbiddenResponse('edit_basic');
  }

  const repos = getRepositories();
  const body = parsed.data;
  const now = new Date().toISOString();
  const newWp: WorkPeriod = {
    id: `wp-${crypto.randomUUID()}`,
    projectId: params.projectId,
    milestoneId: body.milestoneId ?? null,
    number: body.number,
    title: body.title.trim(),
    deliverables: body.deliverables.map((d) => d.trim()).filter(Boolean),
    plannedStartDate: body.plannedStartDate,
    plannedEndDate: body.plannedEndDate,
    amount: body.amount,
    percentage: body.percentage,
    state: body.state ?? 'planned',
    createdAt: now,
    updatedAt: now,
  };

  const created = await repos.workPeriods.create(newWp);
  await recordAuditEvent(request, {
    action: 'create_work_period',
    resourceType: 'work_period',
    resourceId: created.id,
    projectId: params.projectId,
    before: null,
    after: created,
    decisionReason: `create งวดที่ ${created.number} (${created.state})`,
    authorityBasis: 'AUTHZ_MATRIX:edit_basic',
    actor: currentUser,
  });

  return Response.json({ status: 'success', data: created }, { status: 201 });
}
