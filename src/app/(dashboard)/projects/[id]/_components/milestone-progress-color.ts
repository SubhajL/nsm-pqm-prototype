import { COLORS } from '@/theme/antd-theme';

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
 * defensive fallback.
 *
 * Uses the PR-A1 AA-safe `*Text` variants so the colored fill keeps
 * AA contrast against the chip text rendered above it.
 */
const STATUS_TO_STROKE: Record<string, string> = {
  delayed: COLORS.errorText,
  watch: COLORS.warningText,
  on_schedule: COLORS.successText,
};

export function resolveMilestoneProgressStrokeColor(
  displayStatus: string,
): string {
  return STATUS_TO_STROKE[displayStatus] ?? COLORS.info;
}
