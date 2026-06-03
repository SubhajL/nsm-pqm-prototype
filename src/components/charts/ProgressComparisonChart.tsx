'use client';

import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';

import { CHART_COLORS, COLORS } from '@/theme/antd-theme';
import type { EVMDataPoint } from '@/types/evm';

import { todayMarkLine } from './chart-helpers';
import {
  derivePlannedActualSeries,
  type OverallVariance,
} from './progress-comparison-helpers';

interface ProgressComparisonChartProps {
  data: readonly EVMDataPoint[];
  bac: number;
  height?: number;
  /**
   * Toggle the variance band between the planned and actual lines.
   * Defaults to `true`. When disabled the chart renders the two lines
   * cleanly without the tinted fill — useful for dense pages where the
   * area would compete with neighbouring charts.
   */
  showVarianceBand?: boolean;
}

// Color tokens for the variance band. The brand status hexes are intentionally
// used as low-alpha overlays (visual identity, not text) so the band reads as
// "behind" vs "ahead" without competing with the line strokes themselves.
const VARIANCE_FILL: Record<OverallVariance, string> = {
  behind: COLORS.error,
  ahead: COLORS.success,
  // No tint when the two lines coincide; rendered transparent.
  on_track: 'transparent',
};

const PLANNED_NAME = 'แผน (Planned)';
const ACTUAL_NAME = 'จริง (Actual)';

export function ProgressComparisonChart({
  data,
  bac,
  height = 320,
  showVarianceBand = true,
}: ProgressComparisonChartProps) {
  const { months, plannedPct, actualPct, lastIndex, overallVariance } =
    derivePlannedActualSeries(data, bac);

  // The variance band is rendered as two stacked invisible-line series:
  //   - lower bound at min(planned, actual) per point
  //   - delta at |planned - actual| per point, stacked on the lower bound
  // The `delta` series carries the areaStyle; together they paint a band
  // bounded by the two visible lines without leaking down to the x-axis.
  const lowerBound = plannedPct.map((p, i) => Math.min(p, actualPct[i] ?? 0));
  const delta = plannedPct.map((p, i) => Math.abs(p - (actualPct[i] ?? 0)));

  const option: EChartsOption = {
    color: [CHART_COLORS.pv, CHART_COLORS.ev],
    tooltip: {
      trigger: 'axis',
      formatter(params: unknown) {
        const items = (params as Array<{
          seriesName: string;
          value: number;
          marker: string;
          axisValueLabel?: string;
        }>).filter((item) =>
          item.seriesName === PLANNED_NAME || item.seriesName === ACTUAL_NAME,
        );
        const header = items[0]?.axisValueLabel
          ? `<strong>${items[0].axisValueLabel}</strong><br/>`
          : '';
        const lines = items
          .map((item) => `${item.marker} ${item.seriesName}: ${item.value.toFixed(1)}%`)
          .join('<br/>');
        return header + lines;
      },
    },
    legend: {
      top: 0,
      data: [PLANNED_NAME, ACTUAL_NAME],
    },
    grid: {
      top: 50,
      right: 30,
      bottom: 30,
      left: 50,
      containLabel: true,
    },
    xAxis: {
      type: 'category',
      data: months,
      boundaryGap: false,
      axisLabel: { fontSize: 12 },
    },
    yAxis: {
      type: 'value',
      min: 0,
      max: 100,
      axisLabel: { formatter: (v: number) => `${v}%` },
    },
    series: [
      // Lower bound — invisible, anchors the stacked variance band.
      // Filtered out of the tooltip in `tooltip.formatter` so the
      // helper series never surface to readers.
      {
        name: 'variance-lower',
        type: 'line',
        data: lowerBound,
        stack: 'variance',
        symbol: 'none',
        lineStyle: { opacity: 0 },
        z: 0,
      },
      // Delta — invisible line, carries the band fill via areaStyle.
      {
        name: 'variance-delta',
        type: 'line',
        data: showVarianceBand ? delta : [],
        stack: 'variance',
        symbol: 'none',
        lineStyle: { opacity: 0 },
        areaStyle: {
          color: VARIANCE_FILL[overallVariance],
          opacity: 0.16,
        },
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
        // Latest marker via the shared helper so the bilingual label,
        // dash style, color and width flow from one source.
        markLine:
          lastIndex >= 0
            ? {
                ...todayMarkLine({
                  label: 'ข้อมูลงวดล่าสุด (Latest)',
                  color: COLORS.textMuted,
                  lineWidth: 1,
                }),
                silent: true,
                data: [{ xAxis: lastIndex }],
              }
            : undefined,
      },
    ],
  };

  return (
    <ReactECharts
      option={option}
      style={{ height }}
      notMerge={true}
      lazyUpdate={true}
    />
  );
}
