import type dayjs from 'dayjs';

import type { SignatureState } from '@/components/common';

import type { CapturedPhoto } from './PhotoCaptureField';

/**
 * PR-D1c — Migrated form-values shape. `photoMetadata` + the four flat
 * signature fields collapsed into `photos: CapturedPhoto[]` + `signatures:
 * { reporter, inspector }` so the new `PhotoCaptureField` +
 * `SignatureCaptureField` primitives are the single source of truth.
 */
export interface DailyReportFormValues {
  date: dayjs.Dayjs;
  weather: string;
  temperature: number;
  linkedWbs: string[];
  personnel: Array<{ type: string; count: number }>;
  activities: Array<{
    wbsId?: string;
    task: string;
    quantity: number;
    unit: string;
    cumulativeProgress: number;
  }>;
  photos: CapturedPhoto[];
  issues?: string;
  signatures: {
    reporter: SignatureState;
    inspector: SignatureState;
  };
}

export interface UploadQueueItem {
  uid: string;
  name: string;
  size: number;
  type: string;
  file: File;
}
