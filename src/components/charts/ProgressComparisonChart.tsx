'use client';

import { useMemo } from 'react';
import type { EChartsOption } from 'echarts';

import { CHART_COLORS, COLORS } from '@/theme/antd-theme';
import type { EVMDataPoint } from '@/types/evm';

import {
  MONTHLY_LINE_GRID,
  monthlyCategoryAxis,
  topLegend,
} from './chart-defaults';
import { axisTooltipFormatter, formatPercent } from './chart-formatters';
import { latestMarkLine } from './chart-helpers';
import { EChartsWrapper } from './EChartsWrapper';
import { derivePlannedActualSeries } from './progress-comparison-helpers';

interface ProgressComparisonChartProps {
  data: readonly EVMDataPoint[];
  bac: number;
  height?: number;
  /**
   * Toggle the per-segment variance band between the planned and
   * actual lines. Defaults to `true`. When disabled the chart renders
   * just the two visible lines — useful for dense pages where the
   * area would compete with neighbouring charts.
   */
  showVarianceBand?: boolean;
}

const PLANNED_NAME = 'แผน (Planned)';
const ACTUAL_NAME = 'จริง (Actual)';
const VARIANCE_LOWER_NAME = 'variance-lower';
const VARIANCE_BEHIND_NAME = 'variance-behind';
const VARIANCE_AHEAD_NAME = 'variance-ahead';
const HELPER_SERIES_NAMES = new Set<string>([
  VARIANCE_LOWER_NAME,
  VARIANCE_BEHIND_NAME,
  VARIANCE_AHEAD_NAME,
]);

export function ProgressComparisonChart({
  data,
  bac,
  height = 320,
  showVarianceBand = true,
}: ProgressComparisonChartProps) {
  const option: EChartsOption = useMemo(() => {
    const series = derivePlannedActualSeries(data, bac);
    const { months, plannedPct, actualPct, lowerBound, behindFill, aheadFill, lastIndex } = series;

    return {
      color: [CHART_COLORS.pv, CHART_COLORS.ev],
      tooltip: {
        trigger: 'axis',
        formatter: axisTooltipFormatter({
          valueFormat: (v) => formatPercent(v),
          filter: (row) => !HELPER_SERIES_NAMES.has(row.seriesName),
        }),
      },
      legend: topLegend([PLANNED_NAME, ACTUAL_NAME]),
      grid: MONTHLY_LINE_GRID,
      xAxis: monthlyCategoryAxis(months),
      yAxis: {
        type: 'value',
        min: 0,
        max: 100,
        axisLabel: {
          formatter: (v: number) => `${v}%`,
          color: COLORS.textMuted,
        },
      },
      series: [
        // Per-segment variance band — three stacked helper series.
        // When `showVarianceBand` is false every helper series ships
        // empty data so ECharts allocates no area geometry.
        // The three band helper series opt out of `aria.decal`
        // (forced on by EChartsWrapper for WCAG 1.4.1) — decal
        // textures over a 16%-alpha behind/ahead fill would muddy
        // the very red-vs-green signal the band encodes. Decals
        // still apply to the visible Planned/Actual lines below.
        {
          name: VARIANCE_LOWER_NAME,
          type: 'line',
          data: showVarianceBand ? lowerBound : [],
          stack: 'variance',
          symbol: 'none',
          lineStyle: { opacity: 0 },
          itemStyle: { decal: { symbol: 'none' } },
          z: 0,
        },
        {
          name: VARIANCE_BEHIND_NAME,
          type: 'line',
          data: showVarianceBand ? behindFill : [],
          stack: 'variance',
          symbol: 'none',
          lineStyle: { opacity: 0 },
          areaStyle: { color: COLORS.error, opacity: 0.16 },
          itemStyle: { decal: { symbol: 'none' } },
          z: 0,
        },
        {
          name: VARIANCE_AHEAD_NAME,
          type: 'line',
          data: showVarianceBand ? aheadFill : [],
          stack: 'variance',
          symbol: 'none',
          lineStyle: { opacity: 0 },
          areaStyle: { color: COLORS.success, opacity: 0.16 },
          itemStyle: { decal: { symbol: 'none' } },
          z: 0,
        },
        {
          name: PLANNED_NAME,
          type: 'line',
          data: plannedPct,
          smooth: true,
          symbol: 'circle',
          symbolSize: 6,
          lineStyle: { type: 'dashed', width: 2 },
          z: 2,
        },
        {
          name: ACTUAL_NAME,
          type: 'line',
          data: actualPct,
          smooth: true,
          symbol: 'circle',
          symbolSize: 6,
          lineStyle: { width: 2 },
          z: 2,
          markLine: latestMarkLine(lastIndex),
        },
      ],
    };
  }, [data, bac, showVarianceBand]);

  return <EChartsWrapper option={option} height={height} />;
}
