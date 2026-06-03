import { clampPercent } from '@/lib/project-progress-derivations';
import type { EVMDataPoint } from '@/types/evm';

/**
 * Tier 2 PR 3 — pure derivation for the /progress comparison chart.
 *
 * Lives next to `ProgressComparisonChart.tsx` so the ECharts option
 * builder can stay testable under vitest's node env (which can't
 * parse JSX). The chart itself is a thin React wrapper that feeds
 * the output of `derivePlannedActualSeries` into ECharts.
 *
 * **Data scope.** Only financial (EVM) progress has time-series
 * snapshots in the current data model — `evmData[]` is the only
 * historical source. Physical / weighting tracking is recorded as a
 * single current % per WBS node (`node.progress`), with no time
 * dimension. Adding a physical-mode toggle to this chart is therefore
 * deferred as a fidelity decision — a linear back-projection of the
 * current weighted % over each task's Gantt window would render a
 * synthetic curve, but it would lie about non-linear ramps.
 *
 * **Variance band.** Emitted as one `VarianceSegment` per adjacent
 * tick pair so the chart paints with `series.markArea` (one rectangle
 * per segment).
 *
 * Two intentional approximations vs the previous stacked-area
 * approach, both acceptable at 4–12-point monthly resolution:
 *   - **Direction at END tick only.** Each segment is classified as
 *     `behind | ahead | on_track` from `planned vs actual` at the
 *     RIGHT edge. A crossover WITHIN a single tick pair (e.g. start
 *     ahead, end behind) paints the entire segment with the END
 *     direction; the first half of the crossover is lost. Crossovers
 *     ACROSS tick boundaries (segment N behind, segment N+1 ahead)
 *     still render correctly with two adjacent rectangles.
 *   - **Convex-hull rectangle.** `yLower` / `yUpper` take the min /
 *     max of all four corner values (planned + actual at both ticks)
 *     so the rectangle ENCLOSES the band rather than precisely
 *     tracking the area between the two curves. When planned + actual
 *     have similar slopes but different y-offsets the rectangle
 *     overshoots the actual band area on both top and bottom edges.
 *
 * These trade-offs eliminate the helper-series + tooltip-filter +
 * decal opt-out machinery the previous stacked-area approach
 * required. If higher precision becomes necessary, the `plannedPct`
 * and `actualPct` arrays remain available for a future
 * stacked-area-style rendering.
 */

export type OverallVariance = 'behind' | 'ahead' | 'on_track';

/**
 * Per-segment variance direction. Structurally identical to
 * `OverallVariance`; aliased here to document the distinct semantic
 * (segment-pointwise vs whole-history aggregate) while keeping a
 * single source of truth for the literal union.
 */
export type VarianceSegmentDirection = OverallVariance;

export interface VarianceSegment {
  /** Start tick index (inclusive). Paints from `xAxis: startIndex`. */
  startIndex: number;
  /** End tick index (exclusive of segment, the right edge of the rectangle). */
  endIndex: number;
  /** Direction inferred from `planned vs actual` at the END tick. */
  direction: VarianceSegmentDirection;
  /** Lower y bound of the segment rectangle (min of planned + actual over both ticks). */
  yLower: number;
  /** Upper y bound of the segment rectangle (max of planned + actual over both ticks). */
  yUpper: number;
}

export interface ProgressComparisonSeries {
  /** Bilingual month labels, one per snapshot (sorted chronologically). */
  months: string[];
  /** Planned cumulative progress %, clamped to [0, 100]. PV / BAC × 100. */
  plannedPct: number[];
  /** Actual cumulative progress %, clamped to [0, 100]. EV / BAC × 100. */
  actualPct: number[];
  /**
   * One entry per adjacent tick pair. `n` snapshots → `n - 1`
   * segments. Empty for `n < 2`. The chart feeds these into
   * `series.markArea.data` as `[{xAxis:start, yAxis:yLower}, {xAxis:end, yAxis:yUpper}]`
   * pairs, tinted by `direction`.
   */
  varianceSegments: VarianceSegment[];
  /** Index of the latest snapshot (for the Latest marker). `-1` when empty. */
  lastIndex: number;
  /** Variance direction at the LATEST snapshot — informational only. */
  overallVariance: OverallVariance;
}

export function derivePlannedActualSeries(
  evmData: readonly EVMDataPoint[],
  bac: number,
): ProgressComparisonSeries {
  if (!evmData.length || bac <= 0) {
    return {
      months: [],
      plannedPct: [],
      actualPct: [],
      varianceSegments: [],
      lastIndex: -1,
      overallVariance: 'on_track',
    };
  }

  const sorted = [...evmData].sort((a, b) => a.month.localeCompare(b.month));

  const months = sorted.map((s) => s.monthThai);
  const plannedPct = sorted.map((s) => clampPercent((s.pv / bac) * 100));
  const actualPct = sorted.map((s) => clampPercent((s.ev / bac) * 100));

  const varianceSegments: VarianceSegment[] = [];
  for (let i = 0; i < sorted.length - 1; i += 1) {
    const p0 = plannedPct[i];
    const a0 = actualPct[i];
    const p1 = plannedPct[i + 1];
    const a1 = actualPct[i + 1];
    const direction: VarianceSegmentDirection =
      p1 > a1 ? 'behind' : a1 > p1 ? 'ahead' : 'on_track';
    varianceSegments.push({
      startIndex: i,
      endIndex: i + 1,
      direction,
      yLower: Math.min(p0, a0, p1, a1),
      yUpper: Math.max(p0, a0, p1, a1),
    });
  }

  // Compute variance direction from PRE-clamp raw PV/EV so that projects
  // where both metrics saturate above 100% still report the correct
  // direction (the post-clamp values would both pin at 100 and falsely
  // report `on_track`).
  const lastIndex = sorted.length - 1;
  const lastSnapshot = sorted[lastIndex];
  const overallVariance: OverallVariance =
    lastSnapshot.ev < lastSnapshot.pv
      ? 'behind'
      : lastSnapshot.ev > lastSnapshot.pv
        ? 'ahead'
        : 'on_track';

  return {
    months,
    plannedPct,
    actualPct,
    varianceSegments,
    lastIndex,
    overallVariance,
  };
}
