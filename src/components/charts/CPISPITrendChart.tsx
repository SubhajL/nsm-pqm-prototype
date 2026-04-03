'use client';

import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';

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
}

export function CPISPITrendChart({
  data,
  height = 300,
  primaryLabel = 'CPI',
  secondaryLabel = 'SPI',
  primaryColor = '#52c41a',
  secondaryColor = '#2D6BFF',
  referenceLine = 1,
  yMin = 0.7,
  yMax = 1.2,
  valueFormatter = (value) => value.toFixed(2),
  primaryLabelPosition = 'top',
  secondaryLabelPosition = 'bottom',
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
                color: '#BFBFBF',
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
