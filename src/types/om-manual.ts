/**
 * PR-26 — O&M manual catalogue entry.
 *
 * Each row records one section of the operations & maintenance manual
 * pack attached to a HandoverPacket. The SOP 8.10 minimum is one entry
 * per category — `isHandoverComplete` consults the set of categories
 * present.
 *
 * `documentFileId` is nullable to allow placeholder entries (e.g. the
 * register row is created before the PDF lands).
 */

export const OM_MANUAL_CATEGORIES = [
  'operations',
  'maintenance',
  'safety',
  'spare_parts',
] as const;
export type OmManualCategory = (typeof OM_MANUAL_CATEGORIES)[number];

export interface OmManualEntry {
  id: string;
  handoverPacketId: string;
  category: OmManualCategory;
  title: string;
  documentFileId: string | null;
  notes: string;
}

export const OM_MANUAL_CATEGORY_LABELS: Record<
  OmManualCategory,
  { th: string; en: string }
> = {
  operations: { th: 'การใช้งาน', en: 'Operations' },
  maintenance: { th: 'การบำรุงรักษา', en: 'Maintenance' },
  safety: { th: 'ความปลอดภัย', en: 'Safety' },
  spare_parts: { th: 'อะไหล่', en: 'Spare Parts' },
};
