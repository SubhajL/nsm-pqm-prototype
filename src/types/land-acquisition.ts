/**
 * PR-25 — Land Acquisition register entity.
 *
 * One row per land parcel involved in a project. Tracks the parcel
 * reference (โฉนด / nor sor), the landowner, the area (in rai — 1 rai =
 * 1,600 m²), and acquisition status.
 *
 * `compensationAmount` is null until a compensation figure has been
 * negotiated; it stores the agreed THB amount thereafter.
 */

export const LAND_ACQ_STATUSES = [
  'identified',
  'negotiating',
  'compensated',
  'transferred',
  'contested',
] as const;
export type LandAcquisitionStatus = (typeof LAND_ACQ_STATUSES)[number];

export interface LandAcquisitionRecord {
  id: string;
  projectId: string;
  /** e.g. "โฉนดเลขที่ 12345 ต.ลำชี อ.เมือง". */
  parcelReference: string;
  landownerName: string;
  /** Area in rai (1 rai = 1,600 m²). */
  areaRai: number;
  status: LandAcquisitionStatus;
  /** THB compensation amount, or null until negotiated. */
  compensationAmount: number | null;
  notes: string;
}

export const LAND_ACQ_STATUS_LABELS: Record<
  LandAcquisitionStatus,
  { th: string; en: string; color: string }
> = {
  identified: { th: 'ระบุแปลงแล้ว', en: 'Identified', color: 'default' },
  negotiating: { th: 'กำลังเจรจา', en: 'Negotiating', color: 'processing' },
  compensated: { th: 'ชดเชยแล้ว', en: 'Compensated', color: 'cyan' },
  transferred: { th: 'โอนกรรมสิทธิ์แล้ว', en: 'Transferred', color: 'success' },
  contested: { th: 'พิพาท', en: 'Contested', color: 'error' },
};
