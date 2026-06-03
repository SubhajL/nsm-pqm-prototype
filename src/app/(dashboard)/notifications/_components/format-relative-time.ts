import { getRelativeTimeBucket } from '@/lib/relative-time';

/**
 * Tier 2 PR 2 — bilingual relative-time formatter for the
 * notifications list. Extracted from `helpers.tsx` so the pure
 * function can be unit-tested under vitest's node env (which only
 * picks up `*.test.ts`, not `*.test.tsx`).
 *
 * The clock is fixed to the demo "now" (`2026-07-15T18:00:00`) — the
 * prototype's seed data uses absolute ISO timestamps so all
 * displayed labels stay deterministic across reloads.
 *
 * The bucket math lives in `@/lib/relative-time`. This module owns
 * only the notifications-flavoured copy ("เมื่อวาน (yesterday)",
 * "X นาทีก่อน (X min ago)") and the demo-clock pin.
 */
const DEMO_NOW = new Date('2026-07-15T18:00:00');

export function formatRelativeTime(isoDate: string): string {
  const bucket = getRelativeTimeBucket(isoDate, DEMO_NOW);
  switch (bucket.kind) {
    case 'just_now':
      return 'เมื่อสักครู่ (just now)';
    case 'minutes':
      return `${bucket.count} นาทีก่อน (${bucket.count} min ago)`;
    case 'hours':
      return `${bucket.count} ชม.ก่อน (${bucket.count} hr ago)`;
    case 'yesterday':
      return 'เมื่อวาน (yesterday)';
    case 'days':
      return `${bucket.count} วันก่อน (${bucket.count} days ago)`;
    case 'weeks':
      return `${bucket.count} สัปดาห์ก่อน (${bucket.count} week${bucket.count === 1 ? '' : 's'} ago)`;
    default:
      // Exhaustiveness lock — adding a new RelativeTimeBucket variant
      // without updating this switch becomes a compile error here.
      return assertNeverBucket(bucket);
  }
}

function assertNeverBucket(bucket: never): never {
  throw new Error(
    `Unhandled relative-time bucket: ${JSON.stringify(bucket)}`,
  );
}
