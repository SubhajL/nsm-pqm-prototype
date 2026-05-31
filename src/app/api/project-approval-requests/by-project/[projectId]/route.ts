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
import type { ProjectApprovalRequest } from '@/types/project-approval-request';
import { createProjectApprovalRequestSchema } from '@/types/project-approval-request.schema';

/**
 * PR-27 — Project approval workflow per-project endpoints.
 *
 * GET returns every approval-request row (history + active) for the
 * project. POST creates a new submission in state=`submitted`. There is
 * intentionally no constraint preventing multiple in-flight submissions
 * — the UI is responsible for surfacing "you already have one open"
 * because past projects may legitimately re-submit after a rejection /
 * withdrawal.
 *
 * POST authz: `submit_change_request` — the same broad "I'm a project
 * stakeholder who can ask for changes" capability. Approval / decision
 * actions live on the sibling `/decision` route and are gated on
 * `approve_change_request`.
 */
export async function GET(
  _request: Request,
  { params }: { params: { projectId: string } },
) {
  const forbidden = await requireProjectAccess(params.projectId);
  if (forbidden) return forbidden;

  const list = await getRepositories().projectApprovalRequests.listByProject(
    params.projectId,
  );
  return Response.json({ status: 'success', data: list });
}

export async function POST(
  request: Request,
  { params }: { params: { projectId: string } },
) {
  const forbidden = await requireProjectAccess(params.projectId);
  if (forbidden) return forbidden;

  const currentUser = await getCurrentApiUser();
  if (
    !(await canPerformProjectAction(currentUser, params.projectId, 'submit_change_request'))
  ) {
    return forbiddenResponse('submit_change_request');
  }

  const rawBody: unknown = await request.json().catch(() => null);
  const parsed = parseRequestBody(createProjectApprovalRequestSchema, rawBody);
  if (!parsed.success) return parsed.response;
  const body = parsed.data;

  const actor = currentUser!;
  const now = new Date().toISOString();
  const newRequest: ProjectApprovalRequest = {
    id: `par-${crypto.randomUUID()}`,
    projectId: params.projectId,
    submittedBy: actor.id,
    submittedAt: now,
    state: 'submitted',
    currentApproverRole: 'pm',
    decisionHistory: [],
    notes: body.notes ?? '',
  };

  const created = await getRepositories().projectApprovalRequests.create(newRequest);
  await recordAuditEvent(request, {
    action: 'submit_project_approval_request',
    resourceType: 'project_approval_request',
    resourceId: created.id,
    projectId: params.projectId,
    before: null,
    after: created,
    decisionReason: 'submitted for approval',
    authorityBasis: 'AUTHZ_MATRIX:submit_change_request',
    actor,
  });

  return Response.json({ status: 'success', data: created }, { status: 201 });
}
