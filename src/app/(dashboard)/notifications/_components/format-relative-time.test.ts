import { describe, expect, it } from 'vitest';

import { formatRelativeTime } from './format-relative-time';

/**
 * Tier 2 PR 2 — bilingual relative-time formatter.
 *
 * The notifications panel previously rendered Thai-only relative
 * timestamps (`5 นาทีก่อน`). The shell elsewhere uses the
 * `Thai (English)` bilingual format; aligning the notification
 * timestamps removes the inconsistency.
 *
 * Deterministic clock — the formatter pins `now` to `2026-07-15T18:00:00`
 * (the demo "now"). These tests assert against that fixed clock.
 */

describe('formatRelativeTime', () => {
  it('returns the just-now bilingual label for inputs within 1 minute', () => {
    expect(formatRelativeTime('2026-07-15T17:59:30')).toBe(
      'เมื่อสักครู่ (just now)',
    );
  });

  it('returns minutes-ago when within the hour', () => {
    expect(formatRelativeTime('2026-07-15T17:55:00')).toBe(
      '5 นาทีก่อน (5 min ago)',
    );
    expect(formatRelativeTime('2026-07-15T17:01:00')).toBe(
      '59 นาทีก่อน (59 min ago)',
    );
  });

  it('returns hours-ago when within the day', () => {
    expect(formatRelativeTime('2026-07-15T15:00:00')).toBe(
      '3 ชม.ก่อน (3 hr ago)',
    );
  });

  it('returns the "yesterday" bilingual label for exactly one day ago', () => {
    expect(formatRelativeTime('2026-07-14T18:00:00')).toBe(
      'เมื่อวาน (yesterday)',
    );
  });

  it('returns days-ago for inputs within the past week', () => {
    expect(formatRelativeTime('2026-07-12T18:00:00')).toBe(
      '3 วันก่อน (3 days ago)',
    );
    expect(formatRelativeTime('2026-07-10T18:00:00')).toBe(
      '5 วันก่อน (5 days ago)',
    );
  });

  it('returns weeks-ago for inputs older than a week', () => {
    expect(formatRelativeTime('2026-07-01T18:00:00')).toBe(
      '2 สัปดาห์ก่อน (2 weeks ago)',
    );
    expect(formatRelativeTime('2026-06-15T18:00:00')).toBe(
      '4 สัปดาห์ก่อน (4 weeks ago)',
    );
  });

  it('keeps the singular Thai noun (no plural inflection) while pluralising English (`day` → `days`, `week` → `weeks`)', () => {
    expect(formatRelativeTime('2026-07-13T18:00:00')).toBe(
      '2 วันก่อน (2 days ago)',
    );
    expect(formatRelativeTime('2026-07-08T18:00:00')).toBe(
      '1 สัปดาห์ก่อน (1 week ago)',
    );
  });

  it('collapses future-dated timestamps to the just-now label (defends against seed typos)', () => {
    expect(formatRelativeTime('2027-01-01T00:00:00')).toBe(
      'เมื่อสักครู่ (just now)',
    );
    expect(formatRelativeTime('2026-07-15T18:00:01')).toBe(
      'เมื่อสักครู่ (just now)',
    );
  });
});
