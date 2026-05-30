import { COLORS } from '@/theme/antd-theme';

/**
 * PR-A4 — color-blind-safe chart palette.
 *
 * A six-entry sequence sourced exclusively from `COLORS` tokens. Every
 * entry is locked at ≥ 3:1 against `COLORS.bgLayout` (WCAG SC 1.4.11,
 * non-text contrast) by `chart-palette.test.ts`, so a future tweak that
 * picks a lower-contrast hue fails CI.
 *
 * Why these specific tokens?
 *   - `primary` (#1E3A5F)        — 10.7:1 navy, the brand anchor
 *   - `accentTealText` (#00755C) —  5.3:1 dark teal (AA-safe variant)
 *   - `warningText`    (#A05E00) —  4.8:1 dark amber
 *   - `errorText`      (#B7341C) —  5.6:1 dark red
 *   - `info`           (#1D5EE6) —  5.2:1 bright blue
 *   - `successText`    (#1B7A45) —  5.0:1 dark green
 *
 * The four `*Text` darkened variants land closer together in lightness
 * than the saturated brand colors would, which is exactly what we want
 * for chart fills: under a deuteranope / protanope filter the navy →
 * teal → green run still reads as three distinct shades, and the decal
 * patterns supply the missing channel of variation. See WCAG 1.4.1.
 */
export const ACCESSIBLE_CHART_PALETTE: readonly string[] = [
  COLORS.primary,
  COLORS.accentTealText,
  COLORS.warningText,
  COLORS.errorText,
  COLORS.info,
  COLORS.successText,
] as const;

/**
 * Decal pattern per palette index. Paired 1:1 with
 * `ACCESSIBLE_CHART_PALETTE` so that any chart applying both lists in
 * the same order gets a unique (hue, texture) combination per series.
 *
 * Symbols are restricted to the five supported by ECharts'
 * `aria.decal.decals` parameter (`rect`, `circle`, `triangle`,
 * `diamond`, `pin`). Rotation differentiates two same-symbol entries
 * by giving the user a second visual cue under print / screenshot.
 */
export const DECAL_PATTERNS: readonly {
  symbol: 'rect' | 'circle' | 'triangle' | 'diamond' | 'pin';
  rotation?: number;
}[] = [
  { symbol: 'rect' },
  { symbol: 'circle' },
  { symbol: 'triangle' },
  { symbol: 'diamond' },
  { symbol: 'rect', rotation: Math.PI / 4 },
  { symbol: 'pin' },
] as const;

/**
 * Returns the `{ color, decal }` pair for a given series index, wrapping
 * around with modular arithmetic if the index exceeds the palette
 * length. The decal object is shaped for ECharts' `itemStyle.decal` or
 * the `aria.decal.decals` array.
 */
export function paletteEntryForIndex(i: number): {
  color: string;
  decal: object;
} {
  const len = ACCESSIBLE_CHART_PALETTE.length;
  // JS modulo can yield a negative result for negative inputs; clamp
  // it back into [0, len) so callers never get an undefined entry.
  const idx = ((i % len) + len) % len;
  const color = ACCESSIBLE_CHART_PALETTE[idx]!;
  const pattern = DECAL_PATTERNS[idx]!;
  const decal: { symbol: string; rotation?: number; color: string } = {
    symbol: pattern.symbol,
    color,
  };
  if (pattern.rotation !== undefined) {
    decal.rotation = pattern.rotation;
  }
  return { color, decal };
}
