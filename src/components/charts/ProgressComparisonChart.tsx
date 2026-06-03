'use client';

import { CHART_COLORS, COLORS } from '@/theme/antd-theme';
import type { EVMDataPoint } from '@/types/evm';

import {
  MONTHLY_LINE_GRID,
  monthlyCategoryAxis,
  topLegend,
} from './chart-defaults';
import { axisTooltipFormatter, formatPercent } from './chart-formatters';
import { latestMarkLine } from './chart-helpers';
import { EChartsWrapper, useChartOption } from './EChartsWrapper';
import {
  derivePlannedActualSeries,
  type VarianceSegmentDirection,
} from './progress-comparison-helpers';

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

const SEGMENT_FILL: Record<VarianceSegmentDirection, string | null> = {
  behind: COLORS.error,
  ahead: COLORS.success,
  on_track: null,
};

export function ProgressComparisonChart({
  data,
  bac,
  height = 320,
  showVarianceBand = true,
}: ProgressComparisonChartProps) {
  const option = useChartOption(() => {
    const series = derivePlannedActualSeries(data, bac);
    const { months, plannedPct, actualPct, varianceSegments, lastIndex } = series;

    // Per-segment markArea data — one rectangle per segment where the
    // variance direction is non-zero. Each rectangle carries its own
    // itemStyle.color so the band tint switches at every tick the
    // direction flips (preserves crossover history). markArea sits on
    // the Actual series; ECharts paints it under the line strokes and
    // does not surface helper geometry to tooltip or legend.
    type MarkAreaPoint = {
      xAxis: number;
      yAxis: number;
      itemStyle?: {
        color: string;
        opacity: number;
        // Opt out of aria.decal (forced ON by EChartsWrapper for WCAG
        // 1.4.1) — diagonal-stripe decals over a 16%-alpha fill would
        // muddy the red-vs-green semantic this band exists to encode.
        // Decals still apply to the visible Planned/Actual line series.
        decal: { symbol: 'none' };
      };
    };
    const markAreaData: [MarkAreaPoint, MarkAreaPoint][] = showVarianceBand
      ? varianceSegments.flatMap((seg): [MarkAreaPoint, MarkAreaPoint][] => {
          const color = SEGMENT_FILL[seg.direction];
          if (color === null) return [];
          return [
            [
              {
                xAxis: seg.startIndex,
                yAxis: seg.yLower,
                itemStyle: {
                  color,
                  opacity: 0.16,
                  decal: { symbol: 'none' },
                },
              },
              { xAxis: seg.endIndex, yAxis: seg.yUpper },
            ],
          ];
        })
      : [];

    return {
      color: [CHART_COLORS.pv, CHART_COLORS.ev],
      tooltip: {
        trigger: 'axis',
        formatter: axisTooltipFormatter({
          valueFormat: (v) => formatPercent(v),
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
          markArea:
            markAreaData.length > 0
              ? { silent: true, z: 0, data: markAreaData }
              : undefined,
        },
      ],
    };
  }, [data, bac, showVarianceBand]);

  return <EChartsWrapper option={option} height={height} />;
}
