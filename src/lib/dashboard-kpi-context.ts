/**
 * P-C1 — KPI context helpers.
 *
 * "Every KPI must be framed with context": comparison (vs baseline / last
 * period), freshness, and a non-misleading tone (positive / negative /
 * neutral). These helpers feed the optional `delta` + `freshness` slots on
 * `KPICard`.
 *
 * Pure functions only — no React imports — so they unit-test under the
 * project's node-env vitest config.
 */

import type { Project } from '@/types/project';

export type KpiTone = 'positive' | 'negative' | 'neutral';

export interface KpiDelta {
  /** Signed display text in `Thai (English)` form, eg "+2 (vs baseline)". */
  label: string;
  /** `positive` = good change; `negative` = bad; `neutral` = unknown/zero. */
  tone: KpiTone;
  /** Raw signed delta (current - comparison) for callers that want the number. */
  rawDelta: number;
}

export interface KpiDeltaOptions {
  /**
   * `lower_is_better` for things like "delayed projects" or "issues open";
   * `higher_is_better` for things like "completed on time" or "active
   * projects" (default).
   */
  direction?: 'higher_is_better' | 'lower_is_better';
  /** Bilingual label suffix; defaults to `(vs baseline)`. */
  comparisonLabel?: string;
}

/**
 * Compute a signed delta with tone. Returns a `neutral` tone when the
 * comparison is `null`/`undefined` so the UI can hide the delta block
 * rather than rendering a misleading "+0".
 */
export function computeKpiDelta(
  current: number,
  comparison: number | null | undefined,
  options: KpiDeltaOptions = {},
): KpiDelta {
  const { direction = 'higher_is_better', comparisonLabel = '(vs baseline)' } = options;

  if (comparison === null || comparison === undefined) {
    return { label: 'ไม่มีข้อมูลเปรียบเทียบ (No comparison)', tone: 'neutral', rawDelta: 0 };
  }

  const rawDelta = current - comparison;

  if (rawDelta === 0) {
    return {
      label: `0 ${comparisonLabel}`,
      tone: 'neutral',
      rawDelta: 0,
    };
  }

  const sign = rawDelta > 0 ? '+' : '−';
  const magnitude = Math.abs(rawDelta);
  const label = `${sign}${magnitude} ${comparisonLabel}`;

  const isPositiveChange = direction === 'higher_is_better' ? rawDelta > 0 : rawDelta < 0;
  const tone: KpiTone = isPositiveChange ? 'positive' : 'negative';

  return { label, tone, rawDelta };
}

/**
 * Compute a signed delta for ratio metrics (SPI / CPI / etc.) against a
 * fixed baseline (typically 1.00). Returns a label rounded to 2 decimals
 * so floating-point arithmetic (eg `0.92 - 1.0`) doesn't leak digits
 * into the rendered UI. Higher is always treated as better — matches the
 * EVM convention where SPI/CPI ≥ 1 is on/under target.
 */
export function computeRatioKpiDelta(
  current: number,
  baseline: number,
  options: { comparisonLabel?: string } = {},
): KpiDelta {
  const { comparisonLabel = '(vs baseline)' } = options;

  // Guard against NaN / Infinity — `??` doesn't coalesce NaN, so a
  // bad upstream value (eg `spi = 0 / 0` from missing EVM data) would
  // otherwise leak "−NaN" into the rendered KPI label.
  if (!Number.isFinite(current) || !Number.isFinite(baseline)) {
    return {
      label: `— ${comparisonLabel}`,
      tone: 'neutral',
      rawDelta: 0,
    };
  }

  const rawDelta = Number((current - baseline).toFixed(2));

  if (rawDelta === 0) {
    return { label: `0.00 ${comparisonLabel}`, tone: 'neutral', rawDelta: 0 };
  }

  const sign = rawDelta > 0 ? '+' : '−';
  const magnitude = Math.abs(rawDelta).toFixed(2);
  const label = `${sign}${magnitude} ${comparisonLabel}`;
  const tone: KpiTone = rawDelta > 0 ? 'positive' : 'negative';

  return { label, tone, rawDelta };
}

/**
 * Returns the most recent ISO timestamp across all projects, falling back
 * to `lifecycleStageHistory[*].enteredAt` because the current `Project`
 * type does not persist a top-level `updatedAt`. Returns `null` when
 * neither source has data.
 */
export function getMostRecentProjectUpdatedAt(projects: Project[]): string | null {
  let max: string | null = null;
  for (const project of projects) {
    for (const entry of project.lifecycleStageHistory ?? []) {
      if (!entry?.enteredAt) continue;
      if (max === null || entry.enteredAt > max) {
        max = entry.enteredAt;
      }
    }
  }
  return max;
}

/**
 * Render a freshness label like "อัปเดต 5 นาทีที่แล้ว (Updated 5 min ago)".
 * Buckets:
 *  - < 1 min → "เมื่อสักครู่ (Just now)"
 *  - < 60 min → "X นาทีที่แล้ว (X min ago)"
 *  - < 24 hr → "X ชั่วโมงที่แล้ว (X hr ago)"
 *  - otherwise → "X วันที่แล้ว (X days ago)"
 */
export function formatFreshnessLabel(updatedAt: string | null, now: Date): string {
  if (!updatedAt) {
    return 'ไม่มีข้อมูลอัปเดต (No update info)';
  }
  const updated = new Date(updatedAt).getTime();
  if (Number.isNaN(updated)) {
    return 'ไม่มีข้อมูลอัปเดต (No update info)';
  }
  const diffMs = now.getTime() - updated;
  if (diffMs < 0) {
    return 'อัปเดตในอนาคต (Updated in future)';
  }
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return 'อัปเดตเมื่อสักครู่ (Just now)';
  if (minutes < 60) return `อัปเดต ${minutes} นาทีที่แล้ว (${minutes} min ago)`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `อัปเดต ${hours} ชั่วโมงที่แล้ว (${hours} hr ago)`;
  const days = Math.floor(hours / 24);
  return `อัปเดต ${days} วันที่แล้ว (${days} days ago)`;
}

/**
 * Convenience bundle used by dashboard + executive pages: returns the
 * freshness label string plus the most-recent-updated ISO timestamp.
 */
export function buildPortfolioFreshness(
  projects: Project[],
  now: Date,
): { updatedAt: string | null; label: string } {
  const updatedAt = getMostRecentProjectUpdatedAt(projects);
  return { updatedAt, label: formatFreshnessLabel(updatedAt, now) };
}
