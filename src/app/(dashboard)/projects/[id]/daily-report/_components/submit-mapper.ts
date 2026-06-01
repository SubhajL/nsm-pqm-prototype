/**
 * PR-D1c — Pure submit mapper for the Daily Report wizard.
 *
 * Lifts the API-payload-building logic out of the page component so it
 * can be unit-tested under vitest's node env (no jsdom). The hook
 * `useCreateDailyReport` already accepts `FormData`; this helper builds
 * the exact same shape the legacy `handleCreateDailyReport` produced so
 * existing E2E (batch4-daily-report-file-uploads) keeps passing.
 *
 * Output payload (multipart/form-data fields):
 *  - `metadata` — JSON-stringified report metadata (matches legacy)
 *  - `photoFiles` — repeated File handle per CapturedPhoto
 *  - `attachmentFiles` — repeated File handle per UploadQueueItem
 *
 * The `metadata.photoMetadata` array is derived from `CapturedPhoto[]`
 * stripped down to `{ gpsLat, gpsLng, timestamp }` triples; the order
 * matches the order of the appended `photoFiles` so the server pairs
 * them by index.
 */

import type dayjs from 'dayjs';

import type { SignatureState } from '@/components/common';

import type { CapturedPhoto } from './PhotoCaptureField';

export interface DailyReportSubmitValues {
  projectId: string;
  date: dayjs.Dayjs;
  weather: string;
  temperature: number;
  linkedWbs?: string[];
  personnel?: Array<{ type: string; count: number }>;
  activities?: Array<{
    wbsId?: string;
    task: string;
    quantity: number;
    unit: string;
    cumulativeProgress: number;
  }>;
  photos: CapturedPhoto[];
  attachments: Array<{ file: File; name: string }>;
  signatures: { reporter: SignatureState; inspector: SignatureState };
  issues?: string;
}

/**
 * Returns the metadata JSON object that gets stringified into the
 * `metadata` FormData field. Kept separate so tests can lock the
 * shape without instantiating FormData.
 */
export function buildDailyReportMetadata(
  values: DailyReportSubmitValues,
): Record<string, unknown> {
  const personnel = (values.personnel ?? []).filter(
    (entry) => entry?.type?.trim() && Number(entry.count) > 0,
  );

  const activities = (values.activities ?? [])
    .filter((entry) => entry?.task?.trim())
    .map((entry) => ({
      wbsId: entry.wbsId,
      task: entry.task.trim(),
      quantity: Number(entry.quantity) || 0,
      unit: entry.unit.trim(),
      cumulativeProgress: Math.min(
        1,
        Math.max(0, (Number(entry.cumulativeProgress) || 0) / 100),
      ),
    }));

  const photoMetadata = values.photos.map((photo) => ({
    gpsLat: Number(photo.gpsLat) || 0,
    gpsLng: Number(photo.gpsLng) || 0,
    timestamp: (photo.timestamp ?? '').trim(),
  }));

  const totalPersonnel = personnel.reduce(
    (sum, entry) => sum + Number(entry.count || 0),
    0,
  );

  return {
    projectId: values.projectId,
    date: values.date.format('YYYY-MM-DD'),
    weather: values.weather,
    temperature: values.temperature,
    totalPersonnel,
    personnel,
    linkedWbs: values.linkedWbs ?? [],
    activities,
    photoMetadata,
    issues: values.issues || 'ไม่พบปัญหา',
    signatures: {
      reporter: {
        name: values.signatures.reporter.name.trim(),
        signed: values.signatures.reporter.signed,
        timestamp: values.signatures.reporter.signed
          ? values.signatures.reporter.timestamp ?? new Date().toISOString()
          : null,
      },
      inspector: {
        name: values.signatures.inspector.name.trim(),
        signed: values.signatures.inspector.signed,
        timestamp: values.signatures.inspector.signed
          ? values.signatures.inspector.timestamp ?? new Date().toISOString()
          : null,
      },
    },
    status: 'draft',
  };
}

/**
 * Assemble the FormData payload sent to `useCreateDailyReport`. Mirrors
 * the legacy handler in `daily-report/page.tsx` byte-for-byte so the
 * existing batch4 E2E (which asserts persisted `photos[].url` +
 * `attachments[].url`) keeps passing.
 */
export function buildDailyReportFormData(
  values: DailyReportSubmitValues,
): FormData {
  const formData = new FormData();
  formData.append('metadata', JSON.stringify(buildDailyReportMetadata(values)));
  values.photos.forEach((photo) => {
    formData.append('photoFiles', photo.file, photo.filename);
  });
  values.attachments.forEach((attachment) => {
    formData.append('attachmentFiles', attachment.file, attachment.name);
  });
  return formData;
}
