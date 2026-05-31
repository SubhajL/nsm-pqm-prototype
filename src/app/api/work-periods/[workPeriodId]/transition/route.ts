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
import { getRepositories, type RepositoryRegistry } from '@/lib/repositories';
import {
  canTransitionWorkPeriod,
  evidenceRequirementForState,
  type WorkPeriodEvidenceKind,
} from '@/lib/rid/work-period-state-machine';
import { parseRequestBody } from '@/lib/validation';
import { getProjectDeliveryMethod } from '@/types/project';
import { transitionWorkPeriodRequestSchema } from '@/types/work-period.schema';

const FLAG = 'FEATURE_RID_PAYMENT_FLOW';

/**
 * Bilingual labels for the EVIDENCE_REQUIRED 409 message body. The
 * machine-readable kind is still surfaced as `requiredEvidence`; this
 * map is for the human-facing `message` text only.
 */
const EVIDENCE_KIND_LABEL: Record<WorkPeriodEvidenceKind, string> = {
  delivery_slip: 'ใบส่งมอบงาน (delivery slip)',
  committee_inspection: 'การตรวจรับโดยคณะกรรมการ (committee inspection)',
  payment_voucher: 'ฎีกาเบิกจ่าย (payment voucher)',
};

/**
 * PR-23 follow-up: returns true iff at least one evidence record of the
 * supplied kind exists for the work period. Wired into the transition
 * route so e.g. `submitted` cannot land before a delivery slip is filed.
 */
async function hasEvidenceFor(
  kind: WorkPeriodEvidenceKind,
  workPeriodId: string,
  repos: RepositoryRegistry,
): Promise<boolean> {
  switch (kind) {
    case 'delivery_slip': {
      const slips = await repos.deliverySlips.listByWorkPeriod(workPeriodId);
      return slips.length > 0;
    }
    case 'committee_inspection': {
      const records = await repos.committeeInspections.listByWorkPeriod(workPeriodId);
      return records.length > 0;
    }
    case 'payment_voucher': {
      const voucher = await repos.paymentVouchers.findByWorkPeriod(workPeriodId);
      return voucher !== null;
    }
  }
}

/**
 * POST /api/work-periods/[workPeriodId]/transition — request a state
 * change on a งวดงาน.
 *
 * Decision pipeline:
 *   1. Feature flag (`FEATURE_RID_PAYMENT_FLOW`) — 503 if off.
 *   2. Zod body shape — 400 on malformed input.
 *   3. WorkPeriod lookup — 404 if id is unknown.
 *   4. Project visibility + `edit_basic` authz — 401/403 if blocked.
 *   5. Pure state machine — 409 STATE_TRANSITION_REJECTED with a
 *      human-readable reason if the (from, to, deliveryMethod) triple
 *      is illegal.
 *   6. Persist `state` + `updatedAt`, emit audit event with before/after.
 */
export async function POST(
  request: Request,
  { params }: { params: { workPeriodId: string } },
) {
  if (!isFeatureEnabled(FLAG)) return featureDisabledResponse(FLAG);

  const rawBody: unknown = await request.json().catch(() => null);
  const parsed = parseRequestBody(transitionWorkPeriodRequestSchema, rawBody);
  if (!parsed.success) return parsed.response;

  const repos = getRepositories();
  const workPeriod = await repos.workPeriods.findById(params.workPeriodId);
  if (!workPeriod) {
    return Response.json(
      {
        status: 'error',
        error: {
          code: 'NOT_FOUND',
          message: `Work period ${params.workPeriodId} not found`,
        },
      },
      { status: 404 },
    );
  }

  const forbidden = await requireProjectAccess(workPeriod.projectId);
  if (forbidden) return forbidden;

  const currentUser = await getCurrentApiUser();
  if (
    !(await canPerformProjectAction(
      currentUser,
      workPeriod.projectId,
      'edit_basic',
    ))
  ) {
    return forbiddenResponse('edit_basic');
  }

  const project = await repos.projects.findById(workPeriod.projectId);
  const deliveryMethod = getProjectDeliveryMethod(project ?? undefined);
  const decision = canTransitionWorkPeriod(
    workPeriod.state,
    parsed.data.targetState,
    deliveryMethod,
  );
  if (!decision.ok) {
    return Response.json(
      {
        status: 'error',
        error: {
          code: 'STATE_TRANSITION_REJECTED',
          message: `Transition "${workPeriod.state}" → "${parsed.data.targetState}" is not allowed.`,
          reason: decision.reason,
          deliveryMethod,
        },
      },
      { status: 409 },
    );
  }

  // PR-23 follow-up (post-rebase senior review): the state machine alone
  // is not enough — moving to certain states requires a supporting
  // evidence record (delivery slip / committee inspection / payment
  // voucher) to actually exist on the work period. Enforce here so the
  // state cannot run ahead of the paper trail.
  const evidenceKind = evidenceRequirementForState(parsed.data.targetState);
  if (evidenceKind !== null) {
    const evidenceExists = await hasEvidenceFor(
      evidenceKind,
      workPeriod.id,
      repos,
    );
    if (!evidenceExists) {
      return Response.json(
        {
          status: 'error',
          error: {
            code: 'EVIDENCE_REQUIRED',
            message: `Transition to "${parsed.data.targetState}" requires a ${EVIDENCE_KIND_LABEL[evidenceKind]} record on the work period.`,
            requiredEvidence: evidenceKind,
          },
        },
        { status: 409 },
      );
    }
  }

  const before = { state: workPeriod.state, updatedAt: workPeriod.updatedAt };
  const updated = await repos.workPeriods.update(workPeriod.id, {
    state: parsed.data.targetState,
    updatedAt: new Date().toISOString(),
  });

  await recordAuditEvent(request, {
    action: 'transition_work_period',
    resourceType: 'work_period',
    resourceId: workPeriod.id,
    projectId: workPeriod.projectId,
    before,
    after: { state: updated?.state, updatedAt: updated?.updatedAt },
    decisionReason: `งวดที่ ${workPeriod.number}: ${workPeriod.state} → ${parsed.data.targetState} (${deliveryMethod})`,
    authorityBasis: 'AUTHZ_MATRIX:edit_basic',
    actor: currentUser,
  });

  return Response.json({ status: 'success', data: updated ?? workPeriod });
}
