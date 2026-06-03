import { COLORS } from '@/theme/antd-theme';
import { resolveHealthVisual, type HealthState } from '@/theme/health-visual';

/**
 * Map a milestone view's `displayStatus` to the stroke color of its
 * in-progress Progress bar. Closes audit gap G20: delayed milestones
 * previously rendered their progress in brand blue, contradicting the
 * "ล่าช้า (Delayed)" chip rendered next to them.
 *
 * The four `displayStatus` values come from
 * `deriveTaskGroupScheduleHealth` (page.tsx → milestoneViews):
 *   `on_schedule | watch | delayed | not_started`, plus `completed`
 * when the underlying milestone is signed off. The Progress bar is
 * normally hidden when `isCompleted` so `completed` only matters as a
 * defensive fallback — keep it on `info` (brand blue) so the colour
 * cannot accidentally imply a final outcome on a transient bar.
 *
 * Tier 2 PR 1 — colours sourced from the canonical `resolveHealthVisual`.
 * Only the three banded health states get colourised; every other input
 * (including `not_started`, `completed`, and unknown future statuses)
 * falls back to brand `info`.
 */
const COLORISED_STATES = ['delayed', 'watch', 'on_schedule'] as const satisfies readonly HealthState[];

type ColorisedState = (typeof COLORISED_STATES)[number];

function isColorised(status: string): status is ColorisedState {
  return (COLORISED_STATES as readonly string[]).includes(status);
}

export function resolveMilestoneProgressStrokeColor(
  displayStatus: string,
): string {
  if (!isColorised(displayStatus)) return COLORS.info;
  return resolveHealthVisual(displayStatus).text;
}
