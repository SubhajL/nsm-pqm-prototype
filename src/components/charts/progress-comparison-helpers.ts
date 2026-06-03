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
 * **Variance band.** The `overallVariance` direction is computed from
 * the LATEST snapshot's raw PV vs EV (not the post-clamp %), so a
 * project where both metrics saturate above 100% still reports the
 * correct direction. The current chart paints the band one solid
 * tint reflecting that direction across the full history — a future
 * enhancement could split into per-segment red/green pieces so
 * crossovers (behind → ahead) are visually preserved.
 */

export type OverallVariance = 'behind' | 'ahead' | 'on_track';

export interface ProgressComparisonSeries {
  /** Bilingual month labels, one per snapshot (sorted chronologically). */
  months: string[];
  /** Planned cumulative progress %, clamped to [0, 100]. PV / BAC × 100. */
  plannedPct: number[];
  /** Actual cumulative progress %, clamped to [0, 100]. EV / BAC × 100. */
  actualPct: number[];
  /**
   * Per-tick lower bound of the variance band — `min(planned, actual)`.
   * Used by the chart as the invisible stack anchor under
   * `behindFill` + `aheadFill`.
   */
  lowerBound: number[];
  /**
   * Per-tick behind-plan fill height — `max(0, planned - actual)`.
   * Stacked on `lowerBound`; tinted red. Zero where the project is
   * ahead-or-on-plan at that tick, so the red fill appears only on
   * segments where actual under-runs planned.
   */
  behindFill: number[];
  /**
   * Per-tick ahead-of-plan fill height — `max(0, actual - planned)`.
   * Stacked on `lowerBound + behindFill`; tinted green. Zero where
   * the project is behind-or-on-plan.
   */
  aheadFill: number[];
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
      lowerBound: [],
      behindFill: [],
      aheadFill: [],
      lastIndex: -1,
      overallVariance: 'on_track',
    };
  }

  const sorted = [...evmData].sort((a, b) => a.month.localeCompare(b.month));

  const months = sorted.map((s) => s.monthThai);
  const plannedPct = sorted.map((s) => clampPercent((s.pv / bac) * 100));
  const actualPct = sorted.map((s) => clampPercent((s.ev / bac) * 100));

  // Per-segment band: at every tick the stack is
  //   min(planned, actual)   — invisible anchor
  // + max(0, planned-actual) — RED (behind segment)
  // + max(0, actual-planned) — GREEN (ahead segment)
  // Exactly one of behindFill/aheadFill is non-zero per tick. The
  // resulting stack-top equals max(planned, actual), so the visible
  // Planned and Actual lines remain on the tinted boundaries.
  //
  // The defensive `?? 0` keeps a future length-parity bug from
  // poisoning the stack with `NaN` (silent visual corruption);
  // today the parity is guaranteed by the two `.map(sorted, …)` calls.
  const lowerBound = plannedPct.map((p, i) => Math.min(p, actualPct[i] ?? 0));
  const behindFill = plannedPct.map((p, i) => Math.max(0, p - (actualPct[i] ?? 0)));
  const aheadFill = plannedPct.map((p, i) => Math.max(0, (actualPct[i] ?? 0) - p));

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
    lowerBound,
    behindFill,
    aheadFill,
    lastIndex,
    overallVariance,
  };
}
