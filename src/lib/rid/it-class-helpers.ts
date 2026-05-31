/**
 * PR-30a — Pure helpers for IT-class extensions.
 *
 * Three helpers gate the IT module's behaviour. All are pure (no I/O, no
 * `Date.now()` / wall-clock reads — callers must inject a `now` value
 * where time matters) so they can be unit-tested as a matrix and reused
 * from the route layer.
 *
 *   - `canTransitionSow(from, to)` — Vendor SOW state machine.
 *   - `isSprintComplete(sprint, now)` — Sprint completion predicate.
 *   - `computeSprintHealth(planned, completed)` — Sprint health banding.
 */

import type { SowState } from '@/types/vendor-sow';
import type { ItSprint } from '@/types/sprint';

export type StateMachineDecision =
  | { ok: true }
  | { ok: false; reason: string };

/* ---------------------------------------------------------------------------
 * Vendor SOW state machine
 *
 * draft → agreed → in_delivery → uat → accepted | rejected
 * rejected → in_delivery (rework path)
 *
 * `accepted` is terminal. `rejected` is recoverable.
 * Self-transitions are rejected.
 * ------------------------------------------------------------------------- */

const SOW_TERMINAL_STATES: ReadonlySet<SowState> = new Set<SowState>([
  'accepted',
]);

const SOW_ADJACENCIES: ReadonlyArray<readonly [SowState, SowState]> = [
  ['draft', 'agreed'],
  ['agreed', 'in_delivery'],
  ['in_delivery', 'uat'],
  ['uat', 'accepted'],
  ['uat', 'rejected'],
  ['rejected', 'in_delivery'],
];

export function canTransitionSow(
  from: SowState,
  to: SowState,
): StateMachineDecision {
  if (from === to) {
    return {
      ok: false,
      reason: `Self-transition rejected (state "${from}" is unchanged).`,
    };
  }

  if (SOW_TERMINAL_STATES.has(from)) {
    return {
      ok: false,
      reason: `State "${from}" is terminal; transitions are not permitted.`,
    };
  }

  const match = SOW_ADJACENCIES.some(([a, b]) => a === from && b === to);
  if (match) return { ok: true };

  return {
    ok: false,
    reason: `No legal "${from}" → "${to}" SOW transition.`,
  };
}

/* ---------------------------------------------------------------------------
 * Sprint completion predicate
 *
 * A sprint is "complete" when:
 *   - the end date is in the past (relative to `now`); AND
 *   - velocity has been recorded (`completedPoints > 0`).
 *
 * Both inputs are ISO 8601 date / timestamp strings. Comparison is
 * lexicographic — works correctly because ISO 8601 dates sort
 * chronologically as strings. The end-date comparison is inclusive
 * (a sprint that ended today counts as ended).
 * ------------------------------------------------------------------------- */

export function isSprintComplete(
  sprint: Pick<ItSprint, 'endDate' | 'completedPoints'>,
  now: string,
): boolean {
  if (!Number.isFinite(sprint.completedPoints) || sprint.completedPoints <= 0) {
    return false;
  }
  // ISO 8601 lexicographic comparison: endDate (YYYY-MM-DD) ≤ now (any
  // ISO prefix). Use a slice so a same-day `now` timestamp still counts
  // as "ended today" regardless of HH:MM:SS.
  const nowDate = now.slice(0, 10);
  return sprint.endDate <= nowDate;
}

/* ---------------------------------------------------------------------------
 * Sprint health banding
 *
 * Ratio `completed / planned`:
 *   - ≥ 0.85         → on_track
 *   - 0.60 ≤ r < 0.85 → at_risk
 *   - < 0.60          → off_track
 *
 * Defensive cases:
 *   - planned ≤ 0  → off_track (cannot derive a meaningful ratio).
 *   - completed < 0 → off_track.
 *   - completed > planned (over-delivery) → on_track.
 * ------------------------------------------------------------------------- */

export type SprintHealth = 'on_track' | 'at_risk' | 'off_track';

const ON_TRACK_THRESHOLD = 0.85;
const AT_RISK_THRESHOLD = 0.6;

export function computeSprintHealth(
  planned: number,
  completed: number,
): SprintHealth {
  if (planned <= 0 || completed < 0) return 'off_track';
  const ratio = completed / planned;
  if (ratio >= ON_TRACK_THRESHOLD) return 'on_track';
  if (ratio >= AT_RISK_THRESHOLD) return 'at_risk';
  return 'off_track';
}
