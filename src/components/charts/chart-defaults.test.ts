import { describe, expect, it } from 'vitest';

import { COLORS } from '@/theme/antd-theme';

import { ACCESSIBLE_CHART_PALETTE, DECAL_PATTERNS } from './chart-palette';
import { getChartBaseOption } from './chart-defaults';

/**
 * PR-A4 — chart base option lock-in.
 *
 * `getChartBaseOption()` is merged into every consumer's option via the
 * `EChartsWrapper`. The tests below pin the invariants that any new
 * chart inherits for free, in particular the WCAG 1.4.1 colour-blind
 * texture pass.
 */

describe('getChartBaseOption', () => {
  const base = getChartBaseOption();

  it('returns a fresh object on each call (no shared mutable state)', () => {
    const a = getChartBaseOption();
    const b = getChartBaseOption();
    expect(a).not.toBe(b);
    // Shallow-equal structure though
    expect(Object.keys(a).sort()).toEqual(Object.keys(b).sort());
  });

  it('enables ECharts aria + decal — colour-blind texture (WCAG 1.4.1)', () => {
    expect(base.aria).toBeDefined();
    const aria = base.aria as { enabled?: boolean; decal?: { show?: boolean } };
    expect(aria.enabled).toBe(true);
    expect(aria.decal).toBeDefined();
    expect(aria.decal?.show).toBe(true);
  });

  it('sets default textStyle.color to COLORS.textMuted (AA-safe body text)', () => {
    expect(base.textStyle).toBeDefined();
    const ts = base.textStyle as { color?: string };
    expect(ts.color).toBe(COLORS.textMuted);
  });

  it('exposes the accessible palette as the default colour cycle', () => {
    expect(base.color).toBeDefined();
    expect(Array.isArray(base.color)).toBe(true);
    expect(base.color as string[]).toEqual([...ACCESSIBLE_CHART_PALETTE]);
  });

  it('exposes the matching decal patterns under aria.decal.decals', () => {
    const aria = base.aria as {
      decal?: { decals?: Array<{ symbol?: string }> };
    };
    expect(aria.decal?.decals).toBeDefined();
    expect(Array.isArray(aria.decal?.decals)).toBe(true);
    expect(aria.decal?.decals?.length).toBe(DECAL_PATTERNS.length);
    aria.decal?.decals?.forEach((d, i) => {
      expect(d.symbol).toBe(DECAL_PATTERNS[i]!.symbol);
    });
  });

  it('sets axis label colour to the AA-safe muted text token', () => {
    const xAxis = base.xAxis as { axisLabel?: { color?: string } } | undefined;
    const yAxis = base.yAxis as { axisLabel?: { color?: string } } | undefined;
    expect(xAxis?.axisLabel?.color).toBe(COLORS.textMuted);
    expect(yAxis?.axisLabel?.color).toBe(COLORS.textMuted);
  });
});
