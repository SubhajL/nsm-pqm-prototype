'use client';

import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';
import { COLORS } from '@/theme/antd-theme';
import { todayMarkLine } from './chart-helpers';

export interface TrendSeriesPoint {
  monthThai: string;
  primary: number;
  secondary: number;
}

interface CPISPITrendChartProps {
  data: TrendSeriesPoint[];
  height?: number;
  primaryLabel?: string;
  secondaryLabel?: string;
  primaryColor?: string;
  secondaryColor?: string;
  referenceLine?: number | null;
  yMin?: number;
  yMax?: number;
  valueFormatter?: (value: number) => string;
  primaryLabelPosition?: 'top' | 'bottom';
  secondaryLabelPosition?: 'top' | 'bottom';
  /**
   * PR-C3 follow-up — audit C3 asked for a labeled "today/latest"
   * marker on EVM trend charts (the S-curve already got one in PR #43).
   * When true, renders a vertical dashed guide at the most recent
   * data point with the bilingual label "ข้อมูลงวดล่าสุด (Latest)".
   * Defaults to false to keep existing callers backward-compatible.
   */
  markLatestPoint?: boolean;
}

export function CPISPITrendChart({
  data,
  height = 300,
  primaryLabel = 'CPI',
  secondaryLabel = 'SPI',
  primaryColor = COLORS.chartGreenAlt,
  secondaryColor = COLORS.info,
  referenceLine = 1,
  yMin = 0.7,
  yMax = 1.2,
  valueFormatter = (value) => value.toFixed(2),
  primaryLabelPosition = 'top',
  secondaryLabelPosition = 'bottom',
  markLatestPoint = false,
}: CPISPITrendChartProps) {
  const months = data.map((d) => d.monthThai);
  const primaryData = data.map((d) => d.primary);
  const secondaryData = data.map((d) => d.secondary);

  const option: EChartsOption = {
    color: [primaryColor, secondaryColor],
    tooltip: {
      trigger: 'axis',
      formatter(params: unknown) {
        const items = params as Array<{
          seriesName: string;
          value: number;
          marker: string;
        }>;
        const header = items[0]
          ? `<strong>${(items[0] as unknown as { axisValueLabel: string }).axisValueLabel}</strong><br/>`
          : '';
        const lines = items
          .map((item) => `${item.marker} ${item.seriesName}: ${valueFormatter(item.value)}`)
          .join('<br/>');
        return header + lines;
      },
    },
    legend: {
      top: 0,
      data: [primaryLabel, secondaryLabel],
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
      axisLabel: {
        fontSize: 12,
      },
    },
    yAxis: {
      type: 'value',
      min: yMin,
      max: yMax,
      axisLabel: {
        formatter(value: number) {
          return valueFormatter(value);
        },
      },
    },
    series: [
      {
        name: primaryLabel,
        type: 'line',
        data: primaryData,
        symbol: 'circle',
        symbolSize: 8,
        label: {
          show: true,
          formatter(params: unknown) {
            const p = params as { value: number };
            return valueFormatter(p.value);
          },
          position: primaryLabelPosition,
          fontSize: 11,
          color: primaryColor,
        },
        // G22 follow-up: keep this horizontal reference markLine on the
        // same muted-gray palette as the series[1] vertical "Latest"
        // markLine below so the two read as a coherent set, not two
        // unrelated overlays. `todayMarkLine` is xAxis-oriented and
        // doesn't fit a yAxis reference; until a sibling
        // `referenceMarkLine` helper exists, we hand-roll using the
        // same tokens (textMuted for line + label, dashed, width 1).
        markLine: referenceLine === null
          ? undefined
          : {
              silent: true,
              symbol: 'none',
              label: {
                formatter: valueFormatter(referenceLine),
                position: 'insideEndTop',
                color: COLORS.textMuted,
                fontSize: 11,
              },
              lineStyle: {
                type: 'dashed',
                color: COLORS.textMuted,
                width: 1,
              },
              data: [{ yAxis: referenceLine }],
            },
      },
      {
        name: secondaryLabel,
        type: 'line',
        data: secondaryData,
        symbol: 'circle',
        symbolSize: 8,
        label: {
          show: true,
          formatter(params: unknown) {
            const p = params as { value: number };
            return valueFormatter(p.value);
          },
          position: secondaryLabelPosition,
          fontSize: 11,
          color: secondaryColor,
        },
        // PR-C3 follow-up + G22: adopt `todayMarkLine` so the bilingual
        // marker label, dashed stroke, and `lineWidth: 1` (subtler than
        // the S-curve marker's default 2) flow from one source. Both
        // line and label now share `COLORS.textMuted` — slightly
        // darker than the previous `textDisabled` line, matching the
        // SCurveChart pattern where the "Latest" marker uses one
        // colour uniformly. Override only `silent` (no tooltip) and
        // `data` (anchor to the last point).
        markLine:
          markLatestPoint && data.length > 0
            ? {
                ...todayMarkLine({
                  label: 'ข้อมูลงวดล่าสุด (Latest)',
                  color: COLORS.textMuted,
                  lineWidth: 1,
                }),
                silent: true,
                data: [{ xAxis: data.length - 1 }],
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
