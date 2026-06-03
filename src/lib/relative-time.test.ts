import { describe, expect, it } from 'vitest';

import { getRelativeTimeBucket } from './relative-time';

/**
 * Tier 2 follow-up — shared relative-time bucketing.
 *
 * Both `formatFreshnessLabel` (KPI prefix) and the notifications
 * `formatRelativeTime` (bilingual "X ago") use the same divmod
 * arithmetic. Extracting it here lets each caller pick its own copy
 * vocabulary while sharing the math — and surfaces the demo-clock
 * concept (each caller passes its own `now`) at a single layer.
 *
 * The deterministic clock used in these tests is `now = 2026-07-15T18:00:00`.
 */

const NOW = new Date('2026-07-15T18:00:00');

describe('getRelativeTimeBucket', () => {
  it('returns just_now for inputs within the past minute', () => {
    expect(getRelativeTimeBucket('2026-07-15T17:59:30', NOW)).toEqual({
      kind: 'just_now',
    });
  });

  it('returns minutes with the integer count for inputs within the hour', () => {
    expect(getRelativeTimeBucket('2026-07-15T17:55:00', NOW)).toEqual({
      kind: 'minutes',
      count: 5,
    });
    expect(getRelativeTimeBucket('2026-07-15T17:01:00', NOW)).toEqual({
      kind: 'minutes',
      count: 59,
    });
  });

  it('returns hours with the integer count for inputs within the day', () => {
    expect(getRelativeTimeBucket('2026-07-15T15:00:00', NOW)).toEqual({
      kind: 'hours',
      count: 3,
    });
    expect(getRelativeTimeBucket('2026-07-14T19:00:00', NOW)).toEqual({
      kind: 'hours',
      count: 23,
    });
  });

  it('returns yesterday for inputs exactly one day ago', () => {
    expect(getRelativeTimeBucket('2026-07-14T18:00:00', NOW)).toEqual({
      kind: 'yesterday',
    });
  });

  it('returns days with the integer count for inputs within the week', () => {
    expect(getRelativeTimeBucket('2026-07-12T18:00:00', NOW)).toEqual({
      kind: 'days',
      count: 3,
    });
    expect(getRelativeTimeBucket('2026-07-10T18:00:00', NOW)).toEqual({
      kind: 'days',
      count: 5,
    });
  });

  it('returns weeks with the integer count for inputs older than a week', () => {
    expect(getRelativeTimeBucket('2026-07-01T18:00:00', NOW)).toEqual({
      kind: 'weeks',
      count: 2,
    });
    expect(getRelativeTimeBucket('2026-07-08T18:00:00', NOW)).toEqual({
      kind: 'weeks',
      count: 1,
    });
  });

  it('collapses future-dated timestamps to just_now (defends against seed typos)', () => {
    expect(getRelativeTimeBucket('2027-01-01T00:00:00', NOW)).toEqual({
      kind: 'just_now',
    });
    expect(getRelativeTimeBucket('2026-07-15T18:00:01', NOW)).toEqual({
      kind: 'just_now',
    });
  });

  describe('granularity: "days_max" (KPI freshness)', () => {
    it('emits days with the exact diffDay count for inputs older than a week', () => {
      // 13 days ago — default emits weeks=1 (lossy "1 week"); days_max
      // emits days=13 so the freshness UI keeps exact-day precision.
      expect(
        getRelativeTimeBucket('2026-07-02T18:00:00', NOW, {
          granularity: 'days_max',
        }),
      ).toEqual({ kind: 'days', count: 13 });
      expect(
        getRelativeTimeBucket('2026-06-15T18:00:00', NOW, {
          granularity: 'days_max',
        }),
      ).toEqual({ kind: 'days', count: 30 });
    });

    it('still emits yesterday + minutes + hours + just_now buckets unchanged', () => {
      expect(
        getRelativeTimeBucket('2026-07-14T18:00:00', NOW, {
          granularity: 'days_max',
        }),
      ).toEqual({ kind: 'yesterday' });
      expect(
        getRelativeTimeBucket('2026-07-15T17:55:00', NOW, {
          granularity: 'days_max',
        }),
      ).toEqual({ kind: 'minutes', count: 5 });
    });

    it('never emits the weeks bucket', () => {
      const result = getRelativeTimeBucket('2026-05-01T00:00:00', NOW, {
        granularity: 'days_max',
      });
      expect(result.kind).not.toBe('weeks');
    });
  });
});
