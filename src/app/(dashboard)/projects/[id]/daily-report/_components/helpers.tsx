'use client';

import { CloudOutlined, SunOutlined } from '@ant-design/icons';
import type { UploadFile } from 'antd/es/upload/interface';

import { COLORS } from '@/theme/antd-theme';
import type { DailyReportStatus } from '@/types/daily-report';
import { DAILY_REPORT_STATUS_LABELS } from '@/types/daily-report';

import type { UploadQueueItem } from './types';

export const STATUS_TAG_COLORS: Record<DailyReportStatus, string> = {
  submitted: 'green',
  approved: 'green',
  draft: 'gold',
  rejected: 'red',
};

export const STATUS_FILTER_OPTIONS = [
  { label: 'ทั้งหมด', value: 'all' },
  ...Object.entries(DAILY_REPORT_STATUS_LABELS).map(([value, label]) => ({
    label: `${label.th} (${label.en})`,
    value,
  })),
];

export function getWeatherIcon(weather: string) {
  if (weather.includes('แดด') || weather.includes('Sunny')) {
    return <SunOutlined style={{ color: COLORS.warning, marginRight: 6 }} />;
  }
  return <CloudOutlined style={{ color: COLORS.weatherCloud, marginRight: 6 }} />;
}

export function normalizeUploadQueue(fileList: UploadFile[]): UploadQueueItem[] {
  return fileList
    .filter((file): file is UploadFile & { originFileObj: File } => !!file.originFileObj)
    .map((file) => ({
      uid: file.uid,
      name: file.name,
      size: file.size ?? file.originFileObj.size,
      type: file.type ?? file.originFileObj.type,
      file: file.originFileObj,
    }));
}

export function formatBytes(sizeBytes: number) {
  if (sizeBytes >= 1024 * 1024) {
    return `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`;
  }
  if (sizeBytes >= 1024) {
    return `${Math.round(sizeBytes / 1024)} KB`;
  }
  return `${sizeBytes} B`;
}
