import { describe, expect, it } from 'vitest';

import { COLORS } from '@/theme/antd-theme';
import { getContrastRatio } from '@/theme/contrast';

import {
  ACCESSIBLE_CHART_PALETTE,
  DECAL_PATTERNS,
  paletteEntryForIndex,
} from './chart-palette';

/**
 * PR-A4 — color-blind-safe palette lock-in.
 *
 * Every entry in the palette must:
 *   - be a valid 6-digit hex string
 *   - satisfy WCAG SC 1.4.11 (≥ 3:1 non-text contrast) against the
 *     main chart background `COLORS.bgLayout` — see `theme/contrast`
 *   - have a matching decal pattern at the same index so charts using
 *     `aria.decal.show: true` get visually distinct fill textures even
 *     when two palette entries collapse to a similar grey for users
 *     with red-green colour vision deficiency.
 */

describe('ACCESSIBLE_CHART_PALETTE', () => {
  it('exposes between 6 and 8 entries (enough for stacked bars, donut)', () => {
    expect(ACCESSIBLE_CHART_PALETTE.length).toBeGreaterThanOrEqual(6);
    expect(ACCESSIBLE_CHART_PALETTE.length).toBeLessThanOrEqual(8);
  });

  it('contains only valid 6-digit hex strings', () => {
    for (const color of ACCESSIBLE_CHART_PALETTE) {
      expect(color).toMatch(/^#[0-9a-fA-F]{6}$/);
    }
  });

  it('has no duplicate entries', () => {
    const seen = new Set<string>();
    for (const color of ACCESSIBLE_CHART_PALETTE) {
      expect(seen.has(color.toLowerCase())).toBe(false);
      seen.add(color.toLowerCase());
    }
  });

  it.each(
    ACCESSIBLE_CHART_PALETTE.map((color, index) => ({ color, index })),
  )(
    'entry $index ($color) ≥ 3:1 on bgLayout (WCAG SC 1.4.11)',
    ({ color, index }) => {
      const ratio = getContrastRatio(color, COLORS.bgLayout);
      expect(
        ratio,
        `palette[${index}] (${color}) on bgLayout (${COLORS.bgLayout}): ` +
          `got ratio ${ratio.toFixed(2)}`,
      ).toBeGreaterThanOrEqual(3);
    },
  );
});

describe('DECAL_PATTERNS', () => {
  it('has the same length as ACCESSIBLE_CHART_PALETTE (1:1 pairing)', () => {
    expect(DECAL_PATTERNS.length).toBe(ACCESSIBLE_CHART_PALETTE.length);
  });

  it('uses only the ECharts decal symbols supported by aria.decal', () => {
    const supported = new Set([
      'rect',
      'circle',
      'triangle',
      'diamond',
      'pin',
    ]);
    for (const pattern of DECAL_PATTERNS) {
      expect(supported.has(pattern.symbol)).toBe(true);
    }
  });

  it('uses ≥ 4 visually distinct symbol shapes (so colour-blind users see texture variety)', () => {
    const uniqueSymbols = new Set(DECAL_PATTERNS.map((p) => p.symbol));
    expect(uniqueSymbols.size).toBeGreaterThanOrEqual(4);
  });
});

describe('paletteEntryForIndex', () => {
  it('returns { color, decal } for in-range indexes', () => {
    const entry = paletteEntryForIndex(0);
    expect(entry.color).toBe(ACCESSIBLE_CHART_PALETTE[0]);
    expect(entry.decal).toBeTypeOf('object');
  });

  it('wraps around with modular arithmetic for out-of-range indexes', () => {
    const len = ACCESSIBLE_CHART_PALETTE.length;
    const first = paletteEntryForIndex(0);
    const wrapped = paletteEntryForIndex(len);
    expect(wrapped.color).toBe(first.color);
  });

  it('produces a decal object compatible with the ECharts DecalObject shape', () => {
    const entry = paletteEntryForIndex(2);
    const decal = entry.decal as {
      symbol?: string;
      rotation?: number;
      color?: string;
    };
    expect(typeof decal.symbol).toBe('string');
    // color is allowed to be absent (ECharts auto-derives), but if
    // present must be a valid hex.
    if (decal.color !== undefined) {
      expect(decal.color).toMatch(/^#[0-9a-fA-F]{6}$/);
    }
  });
});
