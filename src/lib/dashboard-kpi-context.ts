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

import { getRelativeTimeBucket } from './relative-time';

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
 * Buckets are shared with the notifications panel via
 * `getRelativeTimeBucket` in `@/lib/relative-time`; this function
 * owns only the KPI-flavoured copy (`อัปเดต` prefix, English `Just
 * now`/`min ago` casing).
 *
 * `granularity: 'days_max'` opts out of the weeks bucket so the
 * freshness UI keeps exact day precision — `weeks → count * 7 days`
 * would round down to multiples of 7 (a 13-day update would render
 * as "7 days ago" instead of "13"). Notifications keep the weeks
 * bucket (`X สัปดาห์ก่อน`) because their copy supports it.
 */
export function formatFreshnessLabel(updatedAt: string | null, now: Date): string {
  if (!updatedAt) {
    return 'ไม่มีข้อมูลอัปเดต (No update info)';
  }
  const parsed = new Date(updatedAt).getTime();
  if (Number.isNaN(parsed)) {
    return 'ไม่มีข้อมูลอัปเดต (No update info)';
  }
  if (parsed > now.getTime()) {
    // Preserve the explicit future-dated label — the bucket helper
    // collapses future inputs to `just_now`, but the freshness UI
    // wants to flag the clock skew explicitly.
    return 'อัปเดตในอนาคต (Updated in future)';
  }

  const bucket = getRelativeTimeBucket(updatedAt, now, {
    granularity: 'days_max',
  });
  switch (bucket.kind) {
    case 'just_now':
      return 'อัปเดตเมื่อสักครู่ (Just now)';
    case 'minutes':
      return `อัปเดต ${bucket.count} นาทีที่แล้ว (${bucket.count} min ago)`;
    case 'hours':
      return `อัปเดต ${bucket.count} ชั่วโมงที่แล้ว (${bucket.count} hr ago)`;
    case 'yesterday':
      return `อัปเดต 1 วันที่แล้ว (1 day ago)`;
    case 'days':
      return `อัปเดต ${bucket.count} วันที่แล้ว (${bucket.count} days ago)`;
    default:
      // Exhaustiveness lock — `granularity: 'days_max'` narrows the
      // return to exclude `weeks`, so this `never` check fires only
      // if a future `RelativeTimeBucket` variant is added.
      return assertNeverBucket(bucket);
  }
}

function assertNeverBucket(bucket: never): never {
  throw new Error(
    `Unhandled relative-time bucket: ${JSON.stringify(bucket)}`,
  );
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
