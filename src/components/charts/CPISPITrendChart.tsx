'use client';

import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';
import { COLORS } from '@/theme/antd-theme';

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
        markLine: referenceLine === null
          ? undefined
          : {
              silent: true,
              symbol: 'none',
              label: {
                formatter: valueFormatter(referenceLine),
                position: 'insideEndTop',
                color: '#999',
                fontSize: 11,
              },
              lineStyle: {
                type: 'dashed',
                color: COLORS.textDisabled,
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
        // PR-C3 follow-up: when `markLatestPoint` is true, attach a
        // vertical "Latest" guide to the secondary series so it
        // doesn't collide with the primary series' yAxis reference
        // line at value 1.0. Styling matches the existing reference
        // markLine on series[0] (muted gray, dashed, width 1) so the
        // two markLines read as a coherent set rather than two
        // unrelated overlays.
        markLine:
          markLatestPoint && data.length > 0
            ? {
                silent: true,
                symbol: 'none',
                label: {
                  formatter: 'ข้อมูลงวดล่าสุด (Latest)',
                  position: 'insideEndTop',
                  color: COLORS.textMuted,
                  fontSize: 11,
                },
                lineStyle: {
                  type: 'dashed',
                  color: COLORS.textDisabled,
                  width: 1,
                },
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
