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
  /** Index of the latest snapshot (for the Latest marker). `-1` when empty. */
  lastIndex: number;
  /** Variance direction at the LATEST snapshot — drives the band tint. */
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
      lastIndex: -1,
      overallVariance: 'on_track',
    };
  }

  const sorted = [...evmData].sort((a, b) => a.month.localeCompare(b.month));

  const months = sorted.map((s) => s.monthThai);
  const plannedPct = sorted.map((s) => clampPercent((s.pv / bac) * 100));
  const actualPct = sorted.map((s) => clampPercent((s.ev / bac) * 100));

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

  return { months, plannedPct, actualPct, lastIndex, overallVariance };
}
