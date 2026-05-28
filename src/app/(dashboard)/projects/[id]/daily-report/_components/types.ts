import type dayjs from 'dayjs';

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
  photoMetadata: Array<{
    gpsLat: number;
    gpsLng: number;
    timestamp: string;
  }>;
  issues?: string;
  reporterName: string;
  reporterSigned: boolean;
  inspectorName: string;
  inspectorSigned: boolean;
}

export interface UploadQueueItem {
  uid: string;
  name: string;
  size: number;
  type: string;
  file: File;
}
