/**
 * Tier 2 PR 2 — bilingual relative-time formatter for the
 * notifications list. Extracted from `helpers.tsx` so the pure
 * function can be unit-tested under vitest's node env (which only
 * picks up `*.test.ts`, not `*.test.tsx`).
 *
 * The clock is fixed to the demo "now" (`2026-07-15T18:00:00`) — the
 * prototype's seed data uses absolute ISO timestamps so all
 * displayed labels stay deterministic across reloads.
 */
const DEMO_NOW = new Date('2026-07-15T18:00:00');

export function formatRelativeTime(isoDate: string): string {
  const then = new Date(isoDate);
  const diffMs = DEMO_NOW.getTime() - then.getTime();
  // Future-dated timestamps (seed-data typo, clock skew on a real-data
  // soft-launch) collapse to "just now" rather than silently flowing
  // through `diffMin < 1` and producing a nonsensical negative bucket.
  if (diffMs < 0) return 'เมื่อสักครู่ (just now)';
  const diffMin = Math.floor(diffMs / 60_000);
  const diffHr = Math.floor(diffMs / 3_600_000);
  const diffDay = Math.floor(diffMs / 86_400_000);

  if (diffMin < 1) return 'เมื่อสักครู่ (just now)';
  if (diffMin < 60) return `${diffMin} นาทีก่อน (${diffMin} min ago)`;
  if (diffHr < 24) return `${diffHr} ชม.ก่อน (${diffHr} hr ago)`;
  if (diffDay === 1) return 'เมื่อวาน (yesterday)';
  if (diffDay < 7) return `${diffDay} วันก่อน (${diffDay} days ago)`;
  const weeks = Math.floor(diffDay / 7);
  return `${weeks} สัปดาห์ก่อน (${weeks} week${weeks === 1 ? '' : 's'} ago)`;
}
