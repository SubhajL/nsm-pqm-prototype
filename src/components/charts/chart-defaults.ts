import type { EChartsOption } from 'echarts';

import { COLORS } from '@/theme/antd-theme';

import { ACCESSIBLE_CHART_PALETTE, DECAL_PATTERNS } from './chart-palette';

/**
 * PR-A4 — shared ECharts baseline.
 *
 * Every chart routed through `EChartsWrapper` is deep-merged on top of
 * the partial option this factory returns. The defaults set:
 *
 *   - `aria.enabled` + `aria.decal.show` — colour-blind safety per
 *     WCAG SC 1.4.1. The decal array mirrors the order of
 *     `ACCESSIBLE_CHART_PALETTE` so palette index N renders with both
 *     the matching hue and the matching texture.
 *   - `color` — the AA-safe palette as the colour cycle, so consumers
 *     that omit `option.color` automatically inherit it.
 *   - `textStyle.color` and `xAxis/yAxis.axisLabel.color` — pinned to
 *     `COLORS.textMuted` (≈ 6.69:1 on white, see PR-A1) so default
 *     axis labels and tooltips meet WCAG-AA without per-chart overrides.
 *
 * The returned object is intentionally a Partial<EChartsOption>; the
 * consuming chart fills in `series`, `xAxis.data`, `tooltip.formatter`,
 * etc. We return a fresh object on every call so a mutation in one
 * consumer can't leak into another.
 */
export function getChartBaseOption(): Partial<EChartsOption> {
  return {
    aria: {
      enabled: true,
      decal: {
        show: true,
        // ECharts cycles through this list in parallel with the colour
        // cycle, so series N gets palette[N] hue AND DECAL_PATTERNS[N]
        // texture.
        decals: DECAL_PATTERNS.map((p) => ({
          symbol: p.symbol,
          ...(p.rotation !== undefined ? { rotation: p.rotation } : {}),
        })),
      },
    },
    color: [...ACCESSIBLE_CHART_PALETTE],
    textStyle: {
      color: COLORS.textMuted,
    },
    xAxis: {
      axisLabel: {
        color: COLORS.textMuted,
      },
    },
    yAxis: {
      axisLabel: {
        color: COLORS.textMuted,
      },
    },
  };
}
