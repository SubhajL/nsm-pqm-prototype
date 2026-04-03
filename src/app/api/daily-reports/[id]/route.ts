import { requireProjectAccess } from '@/lib/project-api-access';
import { getCurrentApiUser } from '@/lib/project-api-access';
import { getDailyReportStore } from '@/lib/daily-report-store';
import { canReviewDailyReport } from '@/lib/auth';
import { pushNotification } from '@/lib/notification-store';
import type { DailyReportStatus } from '@/types/daily-report';
import type { Notification } from '@/types/notification';

const store = getDailyReportStore();

interface UpdateDailyReportBody {
  status?: DailyReportStatus;
  note?: string;
}

export async function GET(
  _request: Request,
  { params }: { params: { id: string } },
) {
  await new Promise((resolve) => setTimeout(resolve, 150));

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

  const rawBody = await request.text();
  const body = (rawBody ? JSON.parse(rawBody) : {}) as UpdateDailyReportBody;
  const nextStatus = body.status;

  if (!nextStatus) {
    return Response.json(
      {
        status: 'error',
        error: { code: 'BAD_REQUEST', message: 'status is required' },
      },
      { status: 400 },
    );
  }

  const canReview = canReviewDailyReport(currentUser.role);
  const canSubmit =
    nextStatus === 'submitted' &&
    (report.status === 'draft' || report.status === 'rejected');
  const canApproveOrReject =
    (nextStatus === 'approved' || nextStatus === 'rejected') &&
    report.status === 'submitted' &&
    canReview;

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

  return Response.json({ status: 'success', data: report });
}
