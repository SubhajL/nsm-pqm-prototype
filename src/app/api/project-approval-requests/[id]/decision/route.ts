export const dynamic = 'force-dynamic';

import { withTransactionalAudit } from '@/lib/audit-helpers';
import {
  canPerformProjectAction,
  forbiddenResponse,
  getCurrentApiUser,
  requireProjectAccess,
} from '@/lib/project-api-access';
import { getRepositories } from '@/lib/repositories';
import {
  canTransitionApprovalRequest,
  nextApproverRoleForState,
} from '@/lib/rid/change-request-routing';
import { parseRequestBody } from '@/lib/validation';
import { STATE_CONFLICT, stateConflictResponse } from '@/lib/state-conflict';
import type {
  ApprovalDecision,
  ApprovalRequestState,
  ProjectApprovalRequest,
} from '@/types/project-approval-request';
import { recordApprovalDecisionSchema } from '@/types/project-approval-request.schema';

/**
 * PR-27 — Record an approval decision on a `ProjectApprovalRequest`.
 *
 * The decision drives the state machine forward per the role of the
 * actor. Mapping:
 *
 *   - decision='approve' + state='submitted'         → 'pm_review'
 *   - decision='approve' + state='pm_review'         → 'bureau_review' (PM/admin)
 *   - decision='approve' + state='bureau_review'     → 'committee_review' (PM/admin)
 *   - decision='approve' + state='committee_review'  → 'approved' (admin)
 *   - decision='reject'                              → 'rejected'
 *   - decision='request_changes'                     → state unchanged; comment recorded
 *
 * `canTransitionApprovalRequest` is the source of truth for legality;
 * this route resolves the next state and delegates the check.
 */
function resolveNextState(
  current: ApprovalRequestState,
  decision: ApprovalDecision['decision'],
): ApprovalRequestState | null {
  if (decision === 'reject') return 'rejected';
  if (decision === 'request_changes') return current;
  // decision === 'approve'
  switch (current) {
    case 'submitted':
      return 'pm_review';
    case 'pm_review':
      return 'bureau_review';
    case 'bureau_review':
      return 'committee_review';
    case 'committee_review':
      return 'approved';
    // Terminal states — `canTransitionApprovalRequest` will refuse.
    case 'approved':
    case 'rejected':
    case 'withdrawn':
      return null;
  }
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } },
) {
  const repos = getRepositories();
  const par = await repos.projectApprovalRequests.findById(params.id);
  if (!par) {
    return Response.json(
      {
        status: 'error',
        error: {
          code: 'NOT_FOUND',
          message: `Project approval request ${params.id} not found`,
        },
      },
      { status: 404 },
    );
  }

  const forbidden = await requireProjectAccess(par.projectId);
  if (forbidden) return forbidden;

  const currentUser = await getCurrentApiUser();
  if (
    !(await canPerformProjectAction(currentUser, par.projectId, 'approve_change_request'))
  ) {
    return forbiddenResponse('approve_change_request');
  }

  const rawBody: unknown = await request.json().catch(() => null);
  const parsed = parseRequestBody(recordApprovalDecisionSchema, rawBody);
  if (!parsed.success) return parsed.response;
  const body = parsed.data;
  const actor = currentUser!;

  if (body.decision === 'reject' && !body.comment.trim()) {
    return Response.json(
      {
        status: 'error',
        error: {
          code: 'VALIDATION_FAILED',
          message: 'comment is required when rejecting',
        },
      },
      { status: 400 },
    );
  }

  const nextState = resolveNextState(par.state, body.decision);
  if (nextState === null) {
    return Response.json(
      {
        status: 'error',
        error: {
          code: 'INVALID_TRANSITION',
          message: `Cannot decide on approval request in terminal state "${par.state}"`,
        },
      },
      { status: 403 },
    );
  }

  // No-op decisions (request_changes) skip the transition guard but
  // still record the comment for the audit trail.
  if (nextState !== par.state) {
    const guard = canTransitionApprovalRequest(par.state, nextState, actor.role);
    if (!guard.ok) {
      return Response.json(
        {
          status: 'error',
          error: { code: 'INVALID_TRANSITION', message: guard.reason },
        },
        { status: 403 },
      );
    }
  }

  const now = new Date().toISOString();
  const decisionEntry: ApprovalDecision = {
    decidedBy: actor.id,
    decidedAt: now,
    decision: body.decision,
    comment: body.comment,
  };

  const patch: Partial<ProjectApprovalRequest> = {
    state: nextState,
    currentApproverRole: nextApproverRoleForState(nextState),
    decisionHistory: [...par.decisionHistory, decisionEntry],
  };

  const before = structuredClone(par);

  // Phase 2-A — transaction-wrap the state-machine advance + audit.
  const updated = await withTransactionalAudit(request, async (txRepos, appendAudit) => {
    // PR-34 — compare-and-swap on state AND history length: a
    // `request_changes` decision keeps the state, so the history-length
    // predicate is what makes a raced decision lose instead of dropping
    // the other reviewer's append-only history entry.
    const result = await txRepos.projectApprovalRequests.updateIfStateAndHistoryLength(
      par.id,
      par.state,
      par.decisionHistory.length,
      patch,
    );
    if (!result) throw STATE_CONFLICT;
    await appendAudit({
      action: 'decide_project_approval_request',
      resourceType: 'project_approval_request',
      resourceId: par.id,
      projectId: par.projectId,
      before,
      after: result,
      decisionReason: `${par.state} → ${nextState} (${body.decision})`,
      authorityBasis: 'AUTHZ_MATRIX:approve_change_request + approval-routing',
      actor,
    });
    return result;
  }).catch((err: unknown) => {
    if (err === STATE_CONFLICT) return null;
    throw err;
  });

  if (!updated) {
    return stateConflictResponse('คำขออนุมัติโครงการ (Approval request)');
  }

  return Response.json({ status: 'success', data: updated });
}
