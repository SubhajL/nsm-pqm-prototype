export const dynamic = 'force-dynamic';

import { recordAuditEvent } from '@/lib/audit-helpers';
import { getRepositories } from '@/lib/repositories';
import {
  canPerformProjectAction,
  forbiddenResponse,
  getCurrentApiUser,
  getVisibleProjectIdsForCurrentUser,
  requireProjectAccess,
} from '@/lib/project-api-access';
import { parseRequestBody } from '@/lib/validation';
import type { ChangeRequest } from '@/types/document';
import {
  createChangeRequestRequestSchema,
  decideChangeRequestRequestSchema,
} from '@/types/document.schema';

export async function GET(request: Request) {
  await new Promise((resolve) => setTimeout(resolve, 150));
  const store: ChangeRequest[] = await getRepositories().changeRequests.list();

  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get('projectId');

  let filtered = [...store];

  if (projectId) {
    const forbidden = await requireProjectAccess(projectId);
    if (forbidden) return forbidden;

    filtered = filtered.filter((cr) => cr.projectId === projectId);
  } else {
    const visibleProjectIds = await getVisibleProjectIdsForCurrentUser();
    filtered = filtered.filter((cr) => visibleProjectIds.has(cr.projectId));
  }

  return Response.json({ status: 'success', data: filtered });
}

export async function POST(request: Request) {
  await new Promise((resolve) => setTimeout(resolve, 150));
  const rawBody: unknown = await request.json().catch(() => null);
  const parsed = parseRequestBody(createChangeRequestRequestSchema, rawBody);
  if (!parsed.success) return parsed.response;
  const body = parsed.data;

  const currentUser = await getCurrentApiUser();
  if (!currentUser) {
    return Response.json(
      { status: 'error', error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
      { status: 401 },
    );
  }

  const forbidden = await requireProjectAccess(body.projectId);
  if (forbidden) return forbidden;

  if (!(await canPerformProjectAction(currentUser, body.projectId, 'submit_change_request'))) {
    return forbiddenResponse('submit_change_request');
  }

  const nextChangeRequest: ChangeRequest = {
    id: `CR-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
    projectId: body.projectId,
    title: body.title,
    reason: body.reason,
    budgetImpact: body.budgetImpact,
    scheduleImpact: body.scheduleImpact,
    linkedWbs: body.linkedWbs,
    priority: body.priority,
    status: 'pending',
    requestedBy: currentUser.name,
    requestedAt: new Date().toISOString(),
    approvedBy: null,
    approvedAt: null,
    attachments: [],
    workflow: [
      { step: 'ส่งคำขอ', user: currentUser.name, date: new Date().toISOString(), status: 'done' },
      { step: 'หัวหน้ากองพิจารณา', user: 'รอระบุผู้อนุมัติ', date: null, status: 'current' },
      { step: 'ประธานอนุมัติ', user: 'รอระบุผู้อนุมัติ', date: null, status: 'pending' },
    ],
  };

  await getRepositories().changeRequests.create(nextChangeRequest);
  await recordAuditEvent(request, {
    action: 'submit_change_request',
    resourceType: 'change_request',
    resourceId: nextChangeRequest.id,
    projectId: nextChangeRequest.projectId,
    before: null,
    after: nextChangeRequest,
    decisionReason: `submit (priority=${nextChangeRequest.priority})`,
    authorityBasis: 'AUTHZ_MATRIX:submit_change_request',
    actor: currentUser,
  });

  return Response.json({ status: 'success', data: nextChangeRequest }, { status: 201 });
}

export async function PATCH(request: Request) {
  await new Promise((resolve) => setTimeout(resolve, 150));
  const store: ChangeRequest[] = await getRepositories().changeRequests.list();

  const rawBody: unknown = await request.json().catch(() => null);
  const parsed = parseRequestBody(decideChangeRequestRequestSchema, rawBody);
  if (!parsed.success) return parsed.response;
  const body = parsed.data;

  const currentUser = await getCurrentApiUser();
  if (!currentUser) {
    return Response.json(
      { status: 'error', error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
      { status: 401 },
    );
  }

  const changeRequest = store.find((entry) => entry.id === body.id);

  if (!changeRequest) {
    return Response.json(
      { status: 'error', error: { code: 'NOT_FOUND', message: 'Change request not found' } },
      { status: 404 },
    );
  }

  const forbidden = await requireProjectAccess(changeRequest.projectId);
  if (forbidden) return forbidden;

  if (
    !(await canPerformProjectAction(currentUser, changeRequest.projectId, 'approve_change_request'))
  ) {
    return forbiddenResponse('approve_change_request');
  }

  const nextStatus =
    body.action === 'approve' ? 'approved' : 'rejected';

  const updatedWorkflow = changeRequest.workflow.map((step, index) => {
    if (index === 0) {
      return step;
    }

    if (body.action === 'approve') {
      return {
        ...step,
        user: step.user === 'รอระบุผู้อนุมัติ' ? currentUser.name : step.user,
        date: step.date ?? new Date().toISOString(),
        status: 'done' as const,
      };
    }

    if (step.status === 'current') {
      return {
        ...step,
        user: step.user === 'รอระบุผู้อนุมัติ' ? currentUser.name : step.user,
        date: new Date().toISOString(),
        status: 'rejected' as const,
      };
    }

    return {
      ...step,
      status: 'pending' as const,
    };
  });

  const beforeChangeRequest = structuredClone(changeRequest);
  const updatedChangeRequest = await getRepositories().changeRequests.update(body.id, {
    status: nextStatus,
    approvedBy: body.action === 'approve' ? currentUser.name : null,
    approvedAt: body.action === 'approve' ? new Date().toISOString() : null,
    workflow: updatedWorkflow,
  });
  await recordAuditEvent(request, {
    action: 'approve_change_request',
    resourceType: 'change_request',
    resourceId: changeRequest.id,
    projectId: changeRequest.projectId,
    before: beforeChangeRequest,
    after: updatedChangeRequest,
    decisionReason: body.action === 'approve' ? 'approved' : 'rejected',
    authorityBasis: 'AUTHZ_MATRIX:approve_change_request',
    actor: currentUser,
  });

  return Response.json({ status: 'success', data: updatedChangeRequest });
}
