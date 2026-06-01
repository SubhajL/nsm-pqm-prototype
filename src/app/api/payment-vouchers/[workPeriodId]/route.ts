export const dynamic = 'force-dynamic';

import { withTransactionalAudit } from '@/lib/audit-helpers';
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
import { canTransitionPaymentVoucher } from '@/lib/rid/work-period-state-machine';
import { parseRequestBody } from '@/lib/validation';
import type { PaymentVoucher } from '@/types/payment-voucher';
import {
  createPaymentVoucherRequestSchema,
  patchPaymentVoucherRequestSchema,
} from '@/types/payment-voucher.schema';

const FLAG = 'FEATURE_RID_PAYMENT_FLOW';

async function loadWorkPeriod(workPeriodId: string) {
  return getRepositories().workPeriods.findById(workPeriodId);
}

function notFoundWorkPeriod(workPeriodId: string): Response {
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
 * GET /api/payment-vouchers/[workPeriodId] — list every voucher on the
 * งวดงาน. Read-only; mutations live on POST + PATCH below.
 */
export async function GET(
  _request: Request,
  { params }: { params: { workPeriodId: string } },
) {
  if (!isFeatureEnabled(FLAG)) return featureDisabledResponse(FLAG);

  const wp = await loadWorkPeriod(params.workPeriodId);
  if (!wp) return notFoundWorkPeriod(params.workPeriodId);

  const forbidden = await requireProjectAccess(wp.projectId);
  if (forbidden) return forbidden;

  const list = await getRepositories().paymentVouchers.listByWorkPeriod(
    params.workPeriodId,
  );
  return Response.json({ status: 'success', data: list });
}

/**
 * POST /api/payment-vouchers/[workPeriodId] — create a draft voucher.
 *
 * `state` is locked to `draft` on creation — state transitions go
 * through PATCH so the audit trail always carries before/after.
 * `voucherNumber`, `approvedAmount`, `paidAt` are not accepted on POST.
 */
export async function POST(
  request: Request,
  { params }: { params: { workPeriodId: string } },
) {
  if (!isFeatureEnabled(FLAG)) return featureDisabledResponse(FLAG);

  const rawBody: unknown = await request.json().catch(() => null);
  const parsed = parseRequestBody(createPaymentVoucherRequestSchema, rawBody);
  if (!parsed.success) return parsed.response;

  const wp = await loadWorkPeriod(params.workPeriodId);
  if (!wp) return notFoundWorkPeriod(params.workPeriodId);

  const forbidden = await requireProjectAccess(wp.projectId);
  if (forbidden) return forbidden;

  const currentUser = await getCurrentApiUser();
  if (!(await canPerformProjectAction(currentUser, wp.projectId, 'edit_basic'))) {
    return forbiddenResponse('edit_basic');
  }

  const body = parsed.data;
  const voucher: PaymentVoucher = {
    id: `pv-${crypto.randomUUID()}`,
    workPeriodId: params.workPeriodId,
    state: 'draft',
    requestedAmount: body.requestedAmount,
    approvedAmount: null,
    voucherNumber: null,
    paidAt: null,
    notes: body.notes?.trim() ?? '',
  };

  // Phase 2-A — atomic create + audit. Money-flow records are the
  // highest-value gov't audit surface; never lose an audit on crash.
  const created = await withTransactionalAudit(request, async (txRepos, appendAudit) => {
    const result = await txRepos.paymentVouchers.create(voucher);
    await appendAudit({
      action: 'create_payment_voucher',
      resourceType: 'payment_voucher',
      resourceId: result.id,
      projectId: wp.projectId,
      before: null,
      after: result,
      decisionReason: `draft payment voucher for งวดที่ ${wp.number}`,
      authorityBasis: 'AUTHZ_MATRIX:edit_basic',
      actor: currentUser,
    });
    return result;
  });

  return Response.json({ status: 'success', data: created }, { status: 201 });
}

/**
 * PATCH /api/payment-vouchers/[workPeriodId] — update voucher state.
 *
 * Body: `{ state, approvedAmount?, voucherNumber?, paidAt?, notes? }`.
 *
 * Policy:
 *   - `voucherNumber` is honoured only when transitioning into
 *     `approved`. Once set, it persists through `paid`.
 *   - `paidAt` is honoured only when transitioning into `paid`; if the
 *     client omits it the server timestamps now.
 *   - `approvedAmount` is honoured at `approved`; otherwise ignored to
 *     prevent finance fields from drifting at the wrong stage.
 */
export async function PATCH(
  request: Request,
  { params }: { params: { workPeriodId: string } },
) {
  if (!isFeatureEnabled(FLAG)) return featureDisabledResponse(FLAG);

  const rawBody: unknown = await request.json().catch(() => null);
  const parsed = parseRequestBody(patchPaymentVoucherRequestSchema, rawBody);
  if (!parsed.success) return parsed.response;

  const wp = await loadWorkPeriod(params.workPeriodId);
  if (!wp) return notFoundWorkPeriod(params.workPeriodId);

  const forbidden = await requireProjectAccess(wp.projectId);
  if (forbidden) return forbidden;

  const currentUser = await getCurrentApiUser();
  if (!(await canPerformProjectAction(currentUser, wp.projectId, 'edit_basic'))) {
    return forbiddenResponse('edit_basic');
  }

  const repos = getRepositories();
  const existing = await repos.paymentVouchers.findByWorkPeriod(
    params.workPeriodId,
  );
  if (!existing) {
    return Response.json(
      {
        status: 'error',
        error: {
          code: 'NOT_FOUND',
          message: `No payment voucher exists for work period ${params.workPeriodId}`,
        },
      },
      { status: 404 },
    );
  }

  const body = parsed.data;

  // PR-23 follow-up (post-rebase senior review): gate the state change
  // through `canTransitionPaymentVoucher` so callers cannot skip stages
  // (e.g. draft → paid) or reverse terminal states (e.g. paid → draft).
  // Envelope shape mirrors `STATE_TRANSITION_REJECTED` on the work-period
  // route so downstream clients can handle both uniformly.
  const decision = canTransitionPaymentVoucher(existing.state, body.state);
  if (!decision.ok) {
    return Response.json(
      {
        status: 'error',
        error: {
          code: 'INVALID_VOUCHER_TRANSITION',
          message: `Payment-voucher transition "${existing.state}" → "${body.state}" is not allowed.`,
          reason: decision.reason,
        },
      },
      { status: 409 },
    );
  }

  const patch: Partial<PaymentVoucher> = { state: body.state };

  if (body.state === 'approved') {
    if (body.approvedAmount !== undefined) patch.approvedAmount = body.approvedAmount;
    if (body.voucherNumber !== undefined) patch.voucherNumber = body.voucherNumber;
  }
  if (body.state === 'paid') {
    patch.paidAt = body.paidAt ?? new Date().toISOString();
  }
  if (body.notes !== undefined) patch.notes = body.notes.trim();

  // Phase 2-A — atomic state-transition + audit.
  const updated = await withTransactionalAudit(request, async (txRepos, appendAudit) => {
    const result = await txRepos.paymentVouchers.update(existing.id, patch);
    await appendAudit({
      action: 'update_payment_voucher',
      resourceType: 'payment_voucher',
      resourceId: existing.id,
      projectId: wp.projectId,
      before: existing,
      after: result,
      decisionReason: `payment voucher งวดที่ ${wp.number}: ${existing.state} → ${body.state}`,
      authorityBasis: 'AUTHZ_MATRIX:edit_basic',
      actor: currentUser,
    });
    return result;
  });

  return Response.json({ status: 'success', data: updated ?? existing });
}
