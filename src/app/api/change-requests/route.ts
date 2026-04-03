import { getChangeRequestStore } from '@/lib/change-request-store';
import { appendAuditLog } from '@/lib/audit-log-store';
import { addChangeRequest, updateChangeRequest } from '@/lib/change-request-store';
import { getCurrentApiUser, getVisibleProjectIdsForCurrentUser, requireProjectAccess } from '@/lib/project-api-access';
import type { ChangeRequest } from '@/types/document';

const store: ChangeRequest[] = getChangeRequestStore();

export async function GET(request: Request) {
  await new Promise((resolve) => setTimeout(resolve, 150));

  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get('projectId');

  let filtered = [...store];

  if (projectId) {
    const forbidden = requireProjectAccess(projectId);
    if (forbidden) return forbidden;

    filtered = filtered.filter((cr) => cr.projectId === projectId);
  } else {
    const visibleProjectIds = getVisibleProjectIdsForCurrentUser();
    filtered = filtered.filter((cr) => visibleProjectIds.has(cr.projectId));
  }

  return Response.json({ status: 'success', data: filtered });
}

export async function POST(request: Request) {
  await new Promise((resolve) => setTimeout(resolve, 150));

  const currentUser = getCurrentApiUser();
  if (!currentUser) {
    return Response.json(
      { status: 'error', error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
      { status: 401 },
    );
  }

  const body = (await request.json()) as {
    projectId: string;
    title: string;
    reason: string;
    budgetImpact: number;
    scheduleImpact: number;
    linkedWbs: string;
    priority: ChangeRequest['priority'];
  };

  const forbidden = requireProjectAccess(body.projectId);
  if (forbidden) return forbidden;

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

  addChangeRequest(nextChangeRequest);
  appendAuditLog(currentUser, 'Approval', `สร้าง Change Request ${nextChangeRequest.id}`);

  return Response.json({ status: 'success', data: nextChangeRequest }, { status: 201 });
}

export async function PATCH(request: Request) {
  await new Promise((resolve) => setTimeout(resolve, 150));

  const currentUser = getCurrentApiUser();
  if (!currentUser) {
    return Response.json(
      { status: 'error', error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
      { status: 401 },
    );
  }

  const body = (await request.json()) as {
    id: string;
    action: 'approve' | 'reject' | 'return';
  };

  const changeRequest = store.find((entry) => entry.id === body.id);

  if (!changeRequest) {
    return Response.json(
      { status: 'error', error: { code: 'NOT_FOUND', message: 'Change request not found' } },
      { status: 404 },
    );
  }

  const forbidden = requireProjectAccess(changeRequest.projectId);
  if (forbidden) return forbidden;

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

  const updatedChangeRequest = updateChangeRequest(body.id, {
    status: nextStatus,
    approvedBy: body.action === 'approve' ? currentUser.name : null,
    approvedAt: body.action === 'approve' ? new Date().toISOString() : null,
    workflow: updatedWorkflow,
  });

  appendAuditLog(
    currentUser,
    'Approval',
    `${body.action === 'approve' ? 'อนุมัติ' : 'ส่งกลับ/ไม่อนุมัติ'} Change Request ${changeRequest.id}`,
  );

  return Response.json({ status: 'success', data: updatedChangeRequest });
}
