export const dynamic = 'force-dynamic';

import { withTransactionalAudit } from '@/lib/audit-helpers';
import {
  canPerformProjectAction,
  forbiddenResponse,
  getCurrentApiUser,
  requireProjectAccess,
} from '@/lib/project-api-access';
import { refreshSignedUrl } from '@/lib/mock-upload-storage';
import { getRepositories } from '@/lib/repositories';
import { parseRequestBody } from '@/lib/validation';
import { updateDailyReportStatusRequestSchema } from '@/types/daily-report.schema';
import type { DailyReport } from '@/types/daily-report';
import type { Notification } from '@/types/notification';

export async function GET(
  _request: Request,
  { params }: { params: { id: string } },
) {
  await new Promise((resolve) => setTimeout(resolve, 150));
  const report = await getRepositories().dailyReports.findById(params.id);

  if (!report) {
    return Response.json(
      {
        status: 'error',
        error: { code: 'NOT_FOUND', message: `Daily report ${params.id} not found` },
      },
      { status: 404 },
    );
  }

  const forbidden = await requireProjectAccess(report.projectId);
  if (forbidden) return forbidden;

  // Phase 0 — re-sign asset URLs so reports older than 5 min still render.
  const refreshed: DailyReport = {
    ...report,
    photos: report.photos.map((p) => ({
      ...p,
      url: p.url ? refreshSignedUrl(p.url) : p.url,
    })),
    attachments: report.attachments.map((a) => ({
      ...a,
      url: refreshSignedUrl(a.url),
    })),
  };

  return Response.json({ status: 'success', data: refreshed });
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } },
) {
  await new Promise((resolve) => setTimeout(resolve, 150));
  const repos = getRepositories();

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

  const report = await repos.dailyReports.findById(params.id);

  if (!report) {
    return Response.json(
      {
        status: 'error',
        error: { code: 'NOT_FOUND', message: `Daily report ${params.id} not found` },
      },
      { status: 404 },
    );
  }

  const forbidden = await requireProjectAccess(report.projectId);
  if (forbidden) return forbidden;

  const currentUser = await getCurrentApiUser();
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
  const requiredAction =
    nextStatus === 'submitted' ? 'submit_daily_report' : 'approve_daily_report';

  if (!(await canPerformProjectAction(currentUser, report.projectId, requiredAction))) {
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

  const patch: Partial<DailyReport> = { status: nextStatus };

  if (nextStatus === 'submitted' && report.signatures) {
    patch.signatures = {
      reporter: {
        ...report.signatures.reporter,
        signed: true,
        timestamp: new Date().toISOString(),
      },
      inspector: {
        name: '',
        signed: false,
        timestamp: null,
      },
    };
  }

  if (nextStatus === 'approved' && report.signatures) {
    patch.signatures = {
      ...(patch.signatures ?? report.signatures),
      inspector: {
        name: currentUser.name,
        signed: true,
        timestamp: new Date().toISOString(),
      },
      // Preserve reporter as-is.
      reporter:
        (patch.signatures?.reporter ?? report.signatures.reporter),
    };
  }

  patch.statusHistory = [
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

  // Phase 2-A — wrap the status transition, the notification push, and
  // the audit append in a single transaction so a crash mid-flow cannot
  // leave a half-applied daily-report status change in the gov't record.
  const updated = await withTransactionalAudit(request, async (txRepos, appendAudit) => {
    const result = (await txRepos.dailyReports.update(report.id, patch)) ?? {
      ...report,
      ...patch,
    };

    // --- Auto-generate notification ---
    const reporterName = result.signatures?.reporter?.name ?? 'วิศวกร';
    const reportLabel = `รายงานประจำวัน #${result.reportNumber}`;
    const actionUrl = `/projects/${result.projectId}/daily-report`;

    let notification: Notification | null = null;

    if (nextStatus === 'submitted') {
      notification = {
        id: `notif-dr-${Date.now()}`,
        type: 'approval',
        title: `${reportLabel} ส่งมาเพื่อขออนุมัติ`,
        message: `${reporterName} ส่ง${reportLabel} (${result.date}) เพื่อขออนุมัติ`,
        projectId: result.projectId,
        isRead: false,
        timestamp: new Date().toISOString(),
        actionUrl,
        severity: 'info',
      };
    } else if (nextStatus === 'approved') {
      notification = {
        id: `notif-dr-${Date.now()}`,
        type: 'approval',
        title: `${reportLabel} ได้รับการอนุมัติ`,
        message: `${currentUser.name} อนุมัติ${reportLabel} (${result.date}) เรียบร้อยแล้ว`,
        projectId: result.projectId,
        isRead: false,
        timestamp: new Date().toISOString(),
        actionUrl,
        severity: 'success',
      };
    } else if (nextStatus === 'rejected') {
      notification = {
        id: `notif-dr-${Date.now()}`,
        type: 'approval',
        title: `${reportLabel} ถูกตีกลับ`,
        message: `${currentUser.name} ตีกลับ${reportLabel} (${result.date}) — กรุณาแก้ไขและส่งใหม่`,
        projectId: result.projectId,
        isRead: false,
        timestamp: new Date().toISOString(),
        actionUrl,
        severity: 'warning',
      };
    }

    if (notification) {
      await txRepos.notifications.push(notification);
    }
    await appendAudit({
      action: requiredAction,
      resourceType: 'daily_report',
      resourceId: result.id,
      projectId: result.projectId,
      before: beforeReport,
      after: result,
      decisionReason: `${beforeReport.status} → ${nextStatus}${
        body.note?.trim() ? `: ${body.note.trim()}` : ''
      }`,
      authorityBasis: `AUTHZ_MATRIX:${requiredAction}`,
      actor: currentUser,
    });
    return result;
  });

  return Response.json({ status: 'success', data: updated });
}
