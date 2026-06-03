import { describe, expect, it } from 'vitest';

import type { EVMDataPoint } from '@/types/evm';

import {
  derivePlannedActualSeries,
  type ProgressComparisonSeries,
} from './progress-comparison-helpers';

/**
 * Tier 2 PR 3 — pure derivation for the /progress comparison chart.
 *
 * The chart renders two line series over monthly buckets: planned
 * progress (PV / BAC × 100) and actual progress (EV / BAC × 100). The
 * variance band tint reflects whether the LATEST snapshot is behind
 * (actual < planned → error tint) or on/ahead (→ success tint).
 *
 * These tests pin the math + ordering invariants the chart relies on.
 */

const snapshot = (
  month: string,
  monthThai: string,
  pv: number,
  ev: number,
  ac = 0,
): EVMDataPoint => ({
  id: `snap-${month}`,
  projectId: 'proj-test',
  month,
  monthThai,
  pv,
  ev,
  ac,
  spi: pv > 0 ? ev / pv : 0,
  cpi: ac > 0 ? ev / ac : 0,
});

describe('derivePlannedActualSeries — empty inputs', () => {
  it('returns an empty series when there are no snapshots', () => {
    const result = derivePlannedActualSeries([], 10_000_000);
    expect(result.months).toEqual([]);
    expect(result.plannedPct).toEqual([]);
    expect(result.actualPct).toEqual([]);
    expect(result.lastIndex).toBe(-1);
    expect(result.overallVariance).toBe('on_track');
  });

  it('treats BAC <= 0 as empty (no division by zero)', () => {
    const data = [snapshot('2026-04', 'เม.ย. 69', 1_000_000, 800_000)];
    const result = derivePlannedActualSeries(data, 0);
    expect(result.months).toEqual([]);
    expect(result.plannedPct).toEqual([]);
    expect(result.actualPct).toEqual([]);
  });

  it('treats negative BAC as empty', () => {
    const data = [snapshot('2026-04', 'เม.ย. 69', 1_000_000, 800_000)];
    const result = derivePlannedActualSeries(data, -5);
    expect(result.months).toEqual([]);
  });
});

describe('derivePlannedActualSeries — % math', () => {
  it('derives planned% = PV/BAC×100 and actual% = EV/BAC×100', () => {
    const data = [
      snapshot('2026-04', 'เม.ย. 69', 2_500_000, 2_000_000),
      snapshot('2026-05', 'พ.ค. 69', 5_000_000, 4_500_000),
    ];
    const result = derivePlannedActualSeries(data, 10_000_000);
    expect(result.plannedPct).toEqual([25, 50]);
    expect(result.actualPct).toEqual([20, 45]);
  });

  it('clamps over-100% values to 100 (defensive against EV > BAC late in lifecycle)', () => {
    const data = [snapshot('2026-09', 'ก.ย. 69', 11_000_000, 12_500_000)];
    const result = derivePlannedActualSeries(data, 10_000_000);
    expect(result.plannedPct).toEqual([100]);
    expect(result.actualPct).toEqual([100]);
  });

  it('clamps negative values to 0 (defensive against bad seed data)', () => {
    const data = [snapshot('2026-04', 'เม.ย. 69', -500_000, -250_000)];
    const result = derivePlannedActualSeries(data, 10_000_000);
    expect(result.plannedPct).toEqual([0]);
    expect(result.actualPct).toEqual([0]);
  });
});

describe('derivePlannedActualSeries — ordering', () => {
  it('sorts by ISO month ascending so x-axis labels read left-to-right chronologically', () => {
    const data = [
      snapshot('2026-07', 'ก.ค. 69', 8_000_000, 7_500_000),
      snapshot('2026-04', 'เม.ย. 69', 2_000_000, 1_600_000),
      snapshot('2026-05', 'พ.ค. 69', 4_000_000, 3_200_000),
    ];
    const result = derivePlannedActualSeries(data, 10_000_000);
    expect(result.months).toEqual(['เม.ย. 69', 'พ.ค. 69', 'ก.ค. 69']);
    expect(result.plannedPct).toEqual([20, 40, 80]);
    expect(result.actualPct).toEqual([16, 32, 75]);
  });

  it('does not mutate the input array', () => {
    const data = [
      snapshot('2026-05', 'พ.ค. 69', 4_000_000, 3_200_000),
      snapshot('2026-04', 'เม.ย. 69', 2_000_000, 1_600_000),
    ];
    const monthsBefore = data.map((d) => d.month);
    derivePlannedActualSeries(data, 10_000_000);
    expect(data.map((d) => d.month)).toEqual(monthsBefore);
  });
});

describe('derivePlannedActualSeries — lastIndex + overallVariance', () => {
  it('points lastIndex at the final snapshot for the Latest marker', () => {
    const data = [
      snapshot('2026-04', 'เม.ย. 69', 2_000_000, 1_600_000),
      snapshot('2026-05', 'พ.ค. 69', 4_000_000, 3_200_000),
      snapshot('2026-06', 'มิ.ย. 69', 6_000_000, 5_400_000),
    ];
    const result = derivePlannedActualSeries(data, 10_000_000);
    expect(result.lastIndex).toBe(2);
  });

  it('reports overallVariance = behind when actual%[last] < planned%[last]', () => {
    const data = [
      snapshot('2026-04', 'เม.ย. 69', 2_000_000, 1_600_000),
      snapshot('2026-07', 'ก.ค. 69', 8_125_000, 7_475_000),
    ];
    const result = derivePlannedActualSeries(data, 12_500_000);
    expect(result.overallVariance).toBe('behind');
  });

  it('reports overallVariance = ahead when actual%[last] > planned%[last]', () => {
    const data = [
      snapshot('2026-04', 'เม.ย. 69', 1_000_000, 1_500_000),
    ];
    const result = derivePlannedActualSeries(data, 10_000_000);
    expect(result.overallVariance).toBe('ahead');
  });

  it('reports overallVariance = on_track when actual%[last] == planned%[last]', () => {
    const data = [snapshot('2026-04', 'เม.ย. 69', 2_500_000, 2_500_000)];
    const result = derivePlannedActualSeries(data, 10_000_000);
    expect(result.overallVariance).toBe('on_track');
  });

  it('reports `behind` from raw PV/EV even when both planned% and actual% saturate at 100', () => {
    // Late-lifecycle project where the original baseline understated
    // total scope. Both PV (12M) and EV (10.5M) exceed BAC (10M); after
    // clamping plannedPct = actualPct = 100, but EV < PV so the project
    // is still behind plan. Pre-clamp comparison preserves the signal.
    const data = [snapshot('2026-09', 'ก.ย. 69', 12_000_000, 10_500_000)];
    const result = derivePlannedActualSeries(data, 10_000_000);
    expect(result.plannedPct).toEqual([100]);
    expect(result.actualPct).toEqual([100]);
    expect(result.overallVariance).toBe('behind');
  });
});

describe('derivePlannedActualSeries — per-segment variance arrays', () => {
  it('produces aligned lowerBound / behindFill / aheadFill arrays', () => {
    const data = [
      // m1: planned 20, actual 16 → behind (delta 4)
      snapshot('2026-04', 'เม.ย. 69', 2_000_000, 1_600_000),
      // m2: planned 30, actual 40 → ahead (delta 10)
      snapshot('2026-05', 'พ.ค. 69', 3_000_000, 4_000_000),
      // m3: planned 50, actual 50 → on track (both zero)
      snapshot('2026-06', 'มิ.ย. 69', 5_000_000, 5_000_000),
    ];
    const result = derivePlannedActualSeries(data, 10_000_000);
    expect(result.lowerBound).toEqual([16, 30, 50]);
    expect(result.behindFill).toEqual([4, 0, 0]);
    expect(result.aheadFill).toEqual([0, 10, 0]);
  });

  it('lowerBound + behindFill + aheadFill == max(planned, actual) at every tick (stack-top invariant)', () => {
    const data = [
      snapshot('2026-04', 'เม.ย. 69', 2_000_000, 1_600_000),
      snapshot('2026-05', 'พ.ค. 69', 3_000_000, 4_000_000),
      snapshot('2026-06', 'มิ.ย. 69', 5_000_000, 5_000_000),
    ];
    const r = derivePlannedActualSeries(data, 10_000_000);
    r.lowerBound.forEach((min, i) => {
      const top = min + r.behindFill[i] + r.aheadFill[i];
      const expected = Math.max(r.plannedPct[i], r.actualPct[i]);
      expect(top).toBe(expected);
    });
  });

  it('returns empty band arrays when input is empty', () => {
    const result = derivePlannedActualSeries([], 10_000_000);
    expect(result.lowerBound).toEqual([]);
    expect(result.behindFill).toEqual([]);
    expect(result.aheadFill).toEqual([]);
  });

  it('paints a crossover history: m1 behind, m3 ahead — both fills are non-zero across the series', () => {
    const data = [
      // m1: behind
      snapshot('2026-04', 'เม.ย. 69', 4_000_000, 2_000_000),
      // m2: still behind, smaller gap
      snapshot('2026-05', 'พ.ค. 69', 5_000_000, 4_500_000),
      // m3: ahead
      snapshot('2026-06', 'มิ.ย. 69', 6_000_000, 7_000_000),
    ];
    const r = derivePlannedActualSeries(data, 10_000_000);
    expect(r.behindFill.some((v) => v > 0)).toBe(true);
    expect(r.aheadFill.some((v) => v > 0)).toBe(true);
  });
});

describe('ProgressComparisonSeries — shape contract', () => {
  it('returns an object whose fields are aligned arrays of equal length', () => {
    const data = [
      snapshot('2026-04', 'เม.ย. 69', 2_000_000, 1_600_000),
      snapshot('2026-05', 'พ.ค. 69', 4_000_000, 3_200_000),
    ];
    const result: ProgressComparisonSeries = derivePlannedActualSeries(
      data,
      10_000_000,
    );
    expect(result.months.length).toBe(result.plannedPct.length);
    expect(result.plannedPct.length).toBe(result.actualPct.length);
  });
});
