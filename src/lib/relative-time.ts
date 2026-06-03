/**
 * Tier 2 follow-up — shared relative-time bucketing.
 *
 * Both `formatFreshnessLabel` in `@/lib/dashboard-kpi-context`
 * (KPI "Updated X ago" prefix) and the notifications panel's
 * `formatRelativeTime` use the same divmod arithmetic on a
 * "now - then" delta. Extracting it here means each caller maps
 * the bucket result onto its OWN bilingual copy without duplicating
 * the bucket boundaries.
 *
 * Each consumer passes its own `now` so the demo clock isn't pinned
 * at this layer: notifications use a fixed `2026-07-15T18:00:00`
 * (deterministic seed alignment), KPI freshness uses `new Date()`
 * (live "minutes ago").
 *
 * Future-dated input is collapsed to `just_now` to defend against
 * seed-data typos and clock skew — a stray future ISO string can't
 * produce a nonsensical negative-bucket label.
 */
export type RelativeTimeBucket =
  | { kind: 'just_now' }
  | { kind: 'minutes'; count: number }
  | { kind: 'hours'; count: number }
  | { kind: 'yesterday' }
  | { kind: 'days'; count: number }
  | { kind: 'weeks'; count: number };

export interface RelativeTimeBucketOptions {
  /**
   * Granularity for inputs older than a day.
   *
   * - `'auto'` (default): emit `weeks` when `diffDay >= 7`. Suits the
   *   notifications panel, where "X weeks ago" is the preferred copy
   *   for older history.
   * - `'days_max'`: cap at the `days` bucket for any input older than a
   *   day — `weeks` is never emitted. Suits KPI freshness, which wants
   *   exact day precision and would otherwise lose up to 6 days of
   *   resolution via the weeks-floor (`14 days ago` instead of `15`).
   */
  granularity?: 'auto' | 'days_max';
}

// Overloads narrow the return type when `granularity: 'days_max'` is
// passed so consumers (formatFreshnessLabel) can exhaustively switch
// without the unreachable `weeks` case fighting the type system.
export function getRelativeTimeBucket(
  isoDate: string,
  now: Date,
  options: { granularity: 'days_max' },
): Exclude<RelativeTimeBucket, { kind: 'weeks' }>;
export function getRelativeTimeBucket(
  isoDate: string,
  now: Date,
  options?: RelativeTimeBucketOptions,
): RelativeTimeBucket;
export function getRelativeTimeBucket(
  isoDate: string,
  now: Date,
  options: RelativeTimeBucketOptions = {},
): RelativeTimeBucket {
  const { granularity = 'auto' } = options;

  const then = new Date(isoDate);
  const diffMs = now.getTime() - then.getTime();
  if (diffMs < 0) return { kind: 'just_now' };

  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 1) return { kind: 'just_now' };
  if (diffMin < 60) return { kind: 'minutes', count: diffMin };

  const diffHr = Math.floor(diffMs / 3_600_000);
  if (diffHr < 24) return { kind: 'hours', count: diffHr };

  const diffDay = Math.floor(diffMs / 86_400_000);
  if (diffDay === 1) return { kind: 'yesterday' };
  if (granularity === 'days_max') return { kind: 'days', count: diffDay };
  if (diffDay < 7) return { kind: 'days', count: diffDay };

  return { kind: 'weeks', count: Math.floor(diffDay / 7) };
}
