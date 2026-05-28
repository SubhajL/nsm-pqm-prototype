import type { WorkflowStatus } from '@/types/quality';

/* Photo placeholders for the inspection */
export const PHOTO_PLACEHOLDERS = [
  {
    id: 'ph-1',
    filename: 'IMG_20690715_093012.jpg',
    label: 'ภาพก่อนเท (Before pour)',
    gpsLat: 13.7563,
    gpsLng: 100.5018,
  },
  {
    id: 'ph-2',
    filename: 'IMG_20690715_094530.jpg',
    label: 'ตรวจเหล็กเสริม (Rebar check)',
    gpsLat: 13.7563,
    gpsLng: 100.5019,
  },
  {
    id: 'ph-3',
    filename: 'IMG_20690715_100215.jpg',
    label: 'Slump Test',
    gpsLat: 13.7564,
    gpsLng: 100.5018,
  },
  {
    id: 'ph-4',
    filename: 'IMG_20690715_101045.jpg',
    label: 'วัดอุณหภูมิ (Temp check)',
    gpsLat: 13.7563,
    gpsLng: 100.5020,
  },
];

export const WORKFLOW_LABELS: Record<WorkflowStatus, { label: string; color: string }> = {
  draft: { label: 'ร่าง (Draft)', color: 'default' },
  confirmed: { label: 'ยืนยันแล้ว (Confirmed)', color: 'processing' },
  signed: { label: 'ลงนามแล้ว (Signed)', color: 'success' },
};
