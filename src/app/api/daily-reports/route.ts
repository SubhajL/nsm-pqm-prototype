export const dynamic = 'force-dynamic';

import { recordAuditEvent } from '@/lib/audit-helpers';
import {
  canPerformProjectAction,
  forbiddenResponse,
  getCurrentApiUser,
  getVisibleProjectIdsForCurrentUser,
  requireProjectAccess,
} from '@/lib/project-api-access';
import { getRepositories } from '@/lib/repositories';
import type { DailyReport } from '@/types/daily-report';
import { persistMockUpload, refreshSignedUrl } from '@/lib/mock-upload-storage';
import { parseRequestBody } from '@/lib/validation';
import { createDailyReportRequestSchema } from '@/types/daily-report.schema';

/**
 * Persisted photo/attachment URLs are short-lived signed URLs (5-min TTL).
 * Re-sign on read so older reports remain renderable. Pass-through for
 * legacy non-signed URLs (local-FS, raw blob URLs from before PR-PH0).
 */
function withFreshlySignedAssets(report: DailyReport): DailyReport {
  return {
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
}

export async function GET(request: Request) {
  await new Promise((resolve) => setTimeout(resolve, 150));
  const store = await getRepositories().dailyReports.list();

  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get('projectId');

  let filtered = [...store];

  if (projectId) {
    const forbidden = await requireProjectAccess(projectId);
    if (forbidden) return forbidden;

    filtered = filtered.filter((r) => r.projectId === projectId);
  } else {
    const visibleProjectIds = await getVisibleProjectIdsForCurrentUser();
    filtered = filtered.filter((report) => visibleProjectIds.has(report.projectId));
  }

  // Sort by date descending (newest first)
  filtered.sort((a, b) => b.date.localeCompare(a.date));

  return Response.json({
    status: 'success',
    data: filtered.map(withFreshlySignedAssets),
  });
}

export async function POST(request: Request) {
  await new Promise((resolve) => setTimeout(resolve, 150));
  const store = await getRepositories().dailyReports.list();

  const contentType = request.headers.get('content-type') ?? '';
  const isMultipart = contentType.includes('multipart/form-data');
  let rawMetadata: unknown = null;
  let uploadedPhotoFiles: File[] = [];
  let uploadedAttachmentFiles: File[] = [];

  if (isMultipart) {
    const formData = await request.formData();
    const metadata = formData.get('metadata');
    if (typeof metadata === 'string') {
      try {
        rawMetadata = JSON.parse(metadata);
      } catch {
        rawMetadata = null;
      }
    } else {
      rawMetadata = {};
    }
    uploadedPhotoFiles = formData
      .getAll('photoFiles')
      .filter((entry): entry is File => entry instanceof File && entry.size > 0);
    uploadedAttachmentFiles = formData
      .getAll('attachmentFiles')
      .filter((entry): entry is File => entry instanceof File && entry.size > 0);
  } else {
    rawMetadata = await request.json().catch(() => null);
  }

  const parsed = parseRequestBody(createDailyReportRequestSchema, rawMetadata);
  if (!parsed.success) return parsed.response;
  const body = parsed.data;

  const forbidden = await requireProjectAccess(body.projectId);
  if (forbidden) return forbidden;

  const currentUser = await getCurrentApiUser();
  if (!(await canPerformProjectAction(currentUser, body.projectId, 'submit_daily_report'))) {
    return forbiddenResponse('submit_daily_report');
  }

  const { projectId } = body;
  const personnel = (body.personnel ?? []).filter(
    (entry) => entry?.type?.trim() && Number(entry.count) > 0,
  );
  const activities = (body.activities ?? [])
    .filter((entry) => entry?.task?.trim())
    .map((entry) => ({
      ...entry,
      task: entry.task.trim(),
      quantity: Number(entry.quantity) || 0,
      cumulativeProgress:
        Number(entry.cumulativeProgress) > 1
          ? Math.min(1, Number(entry.cumulativeProgress) / 100)
          : Number(entry.cumulativeProgress) || 0,
    }));
  const reportId = `dr-${String(store.length + 44).padStart(3, '0')}`;
  const uploadedAt = new Date().toISOString();
  const photoMetadata = body.photoMetadata ?? body.photos ?? [];

  // Track the first upload rejection so we can surface a single 413/415.
  let uploadRejection: { status: 413 | 415 | 400; code: string; message: string } | null = null;

  function rejectionToHttp(reason: 'too_large' | 'mime_not_allowed' | 'empty' | 'infected', details: string) {
    if (reason === 'too_large') {
      return { status: 413 as const, code: 'PAYLOAD_TOO_LARGE', message: details };
    }
    if (reason === 'mime_not_allowed') {
      return { status: 415 as const, code: 'UNSUPPORTED_MEDIA_TYPE', message: details };
    }
    if (reason === 'infected') {
      return { status: 400 as const, code: 'UPLOAD_REJECTED_VIRUS_SCAN', message: details };
    }
    return { status: 400 as const, code: 'UPLOAD_REJECTED_EMPTY', message: details };
  }

  const photos =
    uploadedPhotoFiles.length > 0
      ? (
          await Promise.all(
            uploadedPhotoFiles.map(async (file, index) => {
              const result = await persistMockUpload(file, [
                'daily-reports',
                projectId,
                reportId,
                'photos',
              ]);
              if (!result.ok) {
                if (!uploadRejection) {
                  uploadRejection = rejectionToHttp(result.reason, result.details);
                }
                return null;
              }
              const meta = photoMetadata[index];

              return {
                id: `ph-${reportId}-${index + 1}`,
                filename: result.filename,
                gpsLat: Number(meta?.gpsLat) || 0,
                gpsLng: Number(meta?.gpsLng) || 0,
                timestamp: meta?.timestamp?.trim() || uploadedAt,
                url: result.signedUrl,
                mimeType: result.mimeType,
                sizeBytes: result.sizeBytes,
              };
            }),
          )
        ).filter((entry): entry is NonNullable<typeof entry> => entry !== null)
      : (body.photos ?? [])
          .filter((entry) => entry?.filename?.trim())
          .map((entry, index) => ({
            ...entry,
            id: entry.id ?? `ph-${reportId}-legacy-${index + 1}`,
            filename: entry.filename.trim(),
            gpsLat: Number(entry.gpsLat) || 0,
            gpsLng: Number(entry.gpsLng) || 0,
            timestamp: entry.timestamp?.trim() || uploadedAt,
            url: entry.url,
            mimeType: entry.mimeType,
            sizeBytes: entry.sizeBytes ? Number(entry.sizeBytes) : undefined,
          }));

  if (uploadRejection) {
    return Response.json(
      {
        status: 'error',
        error: {
          code: (uploadRejection as { code: string }).code,
          message: (uploadRejection as { message: string }).message,
        },
      },
      { status: (uploadRejection as { status: number }).status },
    );
  }

  const attachments =
    uploadedAttachmentFiles.length > 0
      ? (
          await Promise.all(
            uploadedAttachmentFiles.map(async (file, index) => {
              const result = await persistMockUpload(file, [
                'daily-reports',
                projectId,
                reportId,
                'attachments',
              ]);
              if (!result.ok) {
                if (!uploadRejection) {
                  uploadRejection = rejectionToHttp(result.reason, result.details);
                }
                return null;
              }

              return {
                id: `att-${reportId}-${index + 1}`,
                filename: result.filename,
                url: result.signedUrl,
                mimeType: result.mimeType,
                sizeBytes: result.sizeBytes,
                uploadedAt,
              };
            }),
          )
        ).filter((entry): entry is NonNullable<typeof entry> => entry !== null)
      : (body.attachments ?? []).map((attachment, index) => ({
          id: attachment.id ?? `att-${reportId}-legacy-${index + 1}`,
          filename: attachment.filename.trim(),
          url: attachment.url,
          mimeType: attachment.mimeType,
          sizeBytes: Number(attachment.sizeBytes) || 0,
          uploadedAt: attachment.uploadedAt ?? uploadedAt,
        }));

  if (uploadRejection) {
    return Response.json(
      {
        status: 'error',
        error: {
          code: (uploadRejection as { code: string }).code,
          message: (uploadRejection as { message: string }).message,
        },
      },
      { status: (uploadRejection as { status: number }).status },
    );
  }

  const newReport: DailyReport = {
    id: reportId,
    projectId,
    reportNumber: store.length + 44,
    date: body.date ?? new Date().toISOString().split('T')[0],
    weather: body.weather ?? '',
    temperature: body.temperature ?? 0,
    linkedWbs: body.linkedWbs ?? [],
    personnel,
    totalPersonnel:
      body.totalPersonnel ??
      personnel.reduce((sum, entry) => sum + Number(entry.count || 0), 0),
    activities,
    photos,
    attachments,
    issues: body.issues ?? '',
    signatures: {
      reporter: body.signatures?.reporter ?? { name: '', signed: false, timestamp: null },
      inspector: body.signatures?.inspector ?? { name: '', signed: false, timestamp: null },
    },
    status: body.status ?? 'draft',
    statusHistory: [
      {
        id: `dr-history-${Date.now()}`,
        status: body.status ?? 'draft',
        actorName: currentUser?.name ?? body.signatures?.reporter?.name ?? 'ระบบ',
        actorRole: currentUser?.role ?? 'Unknown',
        timestamp: new Date().toISOString(),
        note: 'สร้างรายงานประจำวัน',
      },
    ],
  };

  await getRepositories().dailyReports.create(newReport);
  await recordAuditEvent(request, {
    action: 'submit_daily_report',
    resourceType: 'daily_report',
    resourceId: newReport.id,
    projectId: newReport.projectId,
    before: null,
    after: newReport,
    decisionReason: `create (status=${newReport.status})`,
    authorityBasis: 'AUTHZ_MATRIX:submit_daily_report',
  });

  return Response.json({ status: 'success', data: newReport }, { status: 201 });
}
