/**
 * Pure UI helpers for the ใบอนุญาตและที่ดิน (permits & land readiness)
 * surface. The four registers here (permits, public hearings, land
 * acquisition, environmental assessments) are human-maintained — no state
 * machines — so the helpers are limited to role gating and the summary
 * count chips each tab renders above its table.
 */

import { canEditProjectBasics } from '@/lib/project-access-pure';
import type { UserRole } from '@/types/admin';

/**
 * Whether the current user may add register entries. Thin alias over the
 * central `canEditProjectBasics` rule (PR-31 cleanup).
 */
export const canManageCompliance: (
  role: UserRole | null | undefined,
) => boolean = canEditProjectBasics;

export interface StatusCountEntry {
  key: string;
  /** Bilingual "Thai (English)" label from the domain label map. */
  label: string;
  count: number;
  /** AntD tag color from the domain label map. */
  color: string;
}

/**
 * Summarise a register into per-status count chips. Order follows the
 * label map's key order (the domain's canonical progression); statuses
 * with zero records are omitted so the chip row stays short.
 */
export function statusCountEntries<T, S extends string>(
  records: readonly T[],
  getStatus: (record: T) => S,
  labels: Record<S, { th: string; en: string; color: string }>,
): StatusCountEntry[] {
  const counts = new Map<S, number>();
  for (const record of records) {
    const status = getStatus(record);
    counts.set(status, (counts.get(status) ?? 0) + 1);
  }
  return (Object.keys(labels) as S[])
    .filter((status) => (counts.get(status) ?? 0) > 0)
    .map((status) => ({
      key: status,
      label: `${labels[status].th} (${labels[status].en})`,
      count: counts.get(status) ?? 0,
      color: labels[status].color,
    }));
}
