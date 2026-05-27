import { recordAuditEvent } from '@/lib/audit-helpers';
import {
  canPerformProjectAction,
  forbiddenResponse,
  getCurrentApiUser,
  requireProjectAccess,
} from '@/lib/project-api-access';
import { getDailyReportStore } from '@/lib/daily-report-store';
import { pushNotification } from '@/lib/notification-store';
import { ensureProjectDemoStateHydrated, persistProjectDemoState } from '@/lib/project-demo-state';
import { parseRequestBody } from '@/lib/validation';
import { updateDailyReportStatusRequestSchema } from '@/types/daily-report.schema';
import type { Notification } from '@/types/notification';

export async function GET(
  _request: Request,
  { params }: { params: { id: string } },
) {
  await new Promise((resolve) => setTimeout(resolve, 150));
  await ensureProjectDemoStateHydrated();
  const store = getDailyReportStore();

  const report = store.find((r) => r.id === params.id);

  if (!report) {
    return Response.json(
      {
        status: 'error',
        error: { code: 'NOT_FOUND', message: `Daily report ${params.id} not found` },
      },
      { status: 404 },
    );
  }

  const forbidden = requireProjectAccess(report.projectId);
  if (forbidden) return forbidden;

  return Response.json({ status: 'success', data: report });
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } },
) {
  await new Promise((resolve) => setTimeout(resolve, 150));
  await ensureProjectDemoStateHydrated();
  const store = getDailyReportStore();

  const rawText = await request.text();
  let rawBody: unknown = {};
  if (rawText) {
    try {
      rawBody = JSON.parse(rawText);
    } catch {
      rawBody = null;
    }
  }
  const parsed = parseRequestBody(updateDailyReportStatusRequestSchema, rawBody);
  if (!parsed.success) return parsed.response;
  const body = parsed.data;
  const nextStatus = body.status;

  const report = store.find((entry) => entry.id === params.id);

  if (!report) {
    return Response.json(
      {
        status: 'error',
        error: { code: 'NOT_FOUND', message: `Daily report ${params.id} not found` },
      },
      { status: 404 },
    );
  }

  const forbidden = requireProjectAccess(report.projectId);
  if (forbidden) return forbidden;

  const currentUser = getCurrentApiUser();
  if (!currentUser) {
    return Response.json(
      {
        status: 'error',
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
      },
      { status: 401 },
    );
  }

  // Action depends on which transition is being attempted:
  //   - submit/resubmit  → 'submit_daily_report' (Engineer, Team Member, etc.)
  //   - approve/reject   → 'approve_daily_report' (PM, Coordinator, Sys Admin)
  // We gate first on the action's matrix capability, then validate the
  // transition (the latter encodes additional state-machine rules).
  const requiredAction =
    nextStatus === 'submitted' ? 'submit_daily_report' : 'approve_daily_report';

  if (!canPerformProjectAction(currentUser, report.projectId, requiredAction)) {
    return forbiddenResponse(requiredAction);
  }

  const beforeReport = structuredClone(report);

  const canSubmit =
    nextStatus === 'submitted' &&
    (report.status === 'draft' || report.status === 'rejected');
  const canApproveOrReject =
    (nextStatus === 'approved' || nextStatus === 'rejected') &&
    report.status === 'submitted';

  if (!canSubmit && !canApproveOrReject) {
    return Response.json(
      {
        status: 'error',
        error: { code: 'FORBIDDEN', message: 'Status transition is not allowed' },
      },
      { status: 403 },
    );
  }

  report.status = nextStatus;

  // Update reporter signature when submitting
  if (nextStatus === 'submitted' && report.signatures) {
    report.signatures.reporter = {
      ...report.signatures.reporter,
      signed: true,
      timestamp: new Date().toISOString(),
    };
    // Reset inspector signature on (re)submit
    report.signatures.inspector = {
      name: '',
      signed: false,
      timestamp: null,
    };
  }

  // Update inspector signature when PM approves
  if (nextStatus === 'approved' && report.signatures) {
    report.signatures.inspector = {
      name: currentUser.name,
      signed: true,
      timestamp: new Date().toISOString(),
    };
  }

  report.statusHistory = [
    ...(report.statusHistory ?? []),
    {
      id: `dr-history-${Date.now()}`,
      status: nextStatus,
      actorName: currentUser.name,
      actorRole: currentUser.role,
      timestamp: new Date().toISOString(),
      note: body.note?.trim() || undefined,
    },
  ];

  // --- Auto-generate notification ---
  const reporterName = report.signatures?.reporter?.name ?? 'วิศวกร';
  const reportLabel = `รายงานประจำวัน #${report.reportNumber}`;
  const actionUrl = `/projects/${report.projectId}/daily-report`;

  let notification: Notification | null = null;

  if (nextStatus === 'submitted') {
    // Engineer submitted/resubmitted → notify PM
    notification = {
      id: `notif-dr-${Date.now()}`,
      type: 'approval',
      title: `${reportLabel} ส่งมาเพื่อขออนุมัติ`,
      message: `${reporterName} ส่ง${reportLabel} (${report.date}) เพื่อขออนุมัติ`,
      projectId: report.projectId,
      isRead: false,
      timestamp: new Date().toISOString(),
      actionUrl,
      severity: 'info',
    };
  } else if (nextStatus === 'approved') {
    // PM approved → notify reporter
    notification = {
      id: `notif-dr-${Date.now()}`,
      type: 'approval',
      title: `${reportLabel} ได้รับการอนุมัติ`,
      message: `${currentUser.name} อนุมัติ${reportLabel} (${report.date}) เรียบร้อยแล้ว`,
      projectId: report.projectId,
      isRead: false,
      timestamp: new Date().toISOString(),
      actionUrl,
      severity: 'success',
    };
  } else if (nextStatus === 'rejected') {
    // PM rejected → notify reporter
    notification = {
      id: `notif-dr-${Date.now()}`,
      type: 'approval',
      title: `${reportLabel} ถูกตีกลับ`,
      message: `${currentUser.name} ตีกลับ${reportLabel} (${report.date}) — กรุณาแก้ไขและส่งใหม่`,
      projectId: report.projectId,
      isRead: false,
      timestamp: new Date().toISOString(),
      actionUrl,
      severity: 'warning',
    };
  }

  if (notification) {
    pushNotification(notification);
  }
  await persistProjectDemoState();

  await recordAuditEvent(request, {
    action: requiredAction,
    resourceType: 'daily_report',
    resourceId: report.id,
    projectId: report.projectId,
    before: beforeReport,
    after: report,
    decisionReason: `${beforeReport.status} → ${nextStatus}${
      body.note?.trim() ? `: ${body.note.trim()}` : ''
    }`,
    authorityBasis: `AUTHZ_MATRIX:${requiredAction}`,
    actor: currentUser,
  });

  return Response.json({ status: 'success', data: report });
}
