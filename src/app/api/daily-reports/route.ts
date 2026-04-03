import { getVisibleProjectIdsForCurrentUser, requireProjectAccess } from '@/lib/project-api-access';
import { getDailyReportStore } from '@/lib/daily-report-store';
import type { DailyReport } from '@/types/daily-report';
import { getCurrentApiUser } from '@/lib/project-api-access';
import { persistMockUpload } from '@/lib/mock-upload-storage';
import { ensureProjectDemoStateHydrated, persistProjectDemoState } from '@/lib/project-demo-state';

const store = getDailyReportStore();

interface DailyReportCreateMetadata extends Partial<DailyReport> {
  photoMetadata?: Array<{
    gpsLat?: number;
    gpsLng?: number;
    timestamp?: string;
  }>;
}

export async function GET(request: Request) {
  await new Promise((resolve) => setTimeout(resolve, 150));
  await ensureProjectDemoStateHydrated();

  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get('projectId');

  let filtered = [...store];

  if (projectId) {
    const forbidden = requireProjectAccess(projectId);
    if (forbidden) return forbidden;

    filtered = filtered.filter((r) => r.projectId === projectId);
  } else {
    const visibleProjectIds = getVisibleProjectIdsForCurrentUser();
    filtered = filtered.filter((report) => visibleProjectIds.has(report.projectId));
  }

  // Sort by date descending (newest first)
  filtered.sort((a, b) => b.date.localeCompare(a.date));

  return Response.json({ status: 'success', data: filtered });
}

export async function POST(request: Request) {
  await new Promise((resolve) => setTimeout(resolve, 150));
  await ensureProjectDemoStateHydrated();

  const contentType = request.headers.get('content-type') ?? '';
  const isMultipart = contentType.includes('multipart/form-data');
  let body: DailyReportCreateMetadata = {};
  let uploadedPhotoFiles: File[] = [];
  let uploadedAttachmentFiles: File[] = [];

  if (isMultipart) {
    const formData = await request.formData();
    const metadata = formData.get('metadata');
    body =
      typeof metadata === 'string'
        ? (JSON.parse(metadata) as DailyReportCreateMetadata)
        : {};
    uploadedPhotoFiles = formData
      .getAll('photoFiles')
      .filter((entry): entry is File => entry instanceof File && entry.size > 0);
    uploadedAttachmentFiles = formData
      .getAll('attachmentFiles')
      .filter((entry): entry is File => entry instanceof File && entry.size > 0);
  } else {
    body = (await request.json()) as DailyReportCreateMetadata;
  }

  if (!body.projectId) {
    return Response.json(
      {
        status: 'error',
        error: { code: 'BAD_REQUEST', message: 'projectId is required' },
      },
      { status: 400 },
    );
  }

  const forbidden = requireProjectAccess(body.projectId);
  if (forbidden) return forbidden;

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
  const photos =
    uploadedPhotoFiles.length > 0
      ? await Promise.all(
          uploadedPhotoFiles.map(async (file, index) => {
            const stored = await persistMockUpload(file, [
              'daily-reports',
              projectId,
              reportId,
              'photos',
            ]);
            const meta = photoMetadata[index];

            return {
              id: `ph-${reportId}-${index + 1}`,
              filename: stored.filename,
              gpsLat: Number(meta?.gpsLat) || 0,
              gpsLng: Number(meta?.gpsLng) || 0,
              timestamp: meta?.timestamp?.trim() || uploadedAt,
              url: stored.url,
              mimeType: stored.mimeType,
              sizeBytes: stored.sizeBytes,
            };
          }),
        )
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
  const attachments =
    uploadedAttachmentFiles.length > 0
      ? await Promise.all(
          uploadedAttachmentFiles.map(async (file, index) => {
            const stored = await persistMockUpload(file, [
              'daily-reports',
              projectId,
              reportId,
              'attachments',
            ]);

            return {
              id: `att-${reportId}-${index + 1}`,
              filename: stored.filename,
              url: stored.url,
              mimeType: stored.mimeType,
              sizeBytes: stored.sizeBytes,
              uploadedAt,
            };
          }),
        )
      : (body.attachments ?? []).map((attachment, index) => ({
          id: attachment.id ?? `att-${reportId}-legacy-${index + 1}`,
          filename: attachment.filename.trim(),
          url: attachment.url,
          mimeType: attachment.mimeType,
          sizeBytes: Number(attachment.sizeBytes) || 0,
          uploadedAt: attachment.uploadedAt ?? uploadedAt,
        }));

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
        actorName: getCurrentApiUser()?.name ?? body.signatures?.reporter?.name ?? 'ระบบ',
        actorRole: getCurrentApiUser()?.role ?? 'Unknown',
        timestamp: new Date().toISOString(),
        note: 'สร้างรายงานประจำวัน',
      },
    ],
  };

  store.push(newReport);
  await persistProjectDemoState();

  return Response.json({ status: 'success', data: newReport }, { status: 201 });
}
