'use client';

import { COLORS } from '@/theme/antd-theme';

import {
  MONTHLY_LINE_GRID,
  monthlyCategoryAxis,
  topLegend,
} from './chart-defaults';
import { axisTooltipFormatter } from './chart-formatters';
import { latestMarkLine, referenceMarkLine } from './chart-helpers';
import { EChartsWrapper, useChartOption } from './EChartsWrapper';

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
  const option = useChartOption(() => {
    const months = data.map((d) => d.monthThai);
    const primaryData = data.map((d) => d.primary);
    const secondaryData = data.map((d) => d.secondary);
    const lastIndex = markLatestPoint && data.length > 0 ? data.length - 1 : -1;

    return {
      color: [primaryColor, secondaryColor],
      tooltip: {
        trigger: 'axis',
        formatter: axisTooltipFormatter({ valueFormat: valueFormatter }),
      },
      legend: topLegend([primaryLabel, secondaryLabel]),
      xAxis: monthlyCategoryAxis(months),
      grid: MONTHLY_LINE_GRID,
      yAxis: {
        type: 'value',
        min: yMin,
        max: yMax,
        axisLabel: {
          formatter: (value: number) => valueFormatter(value),
          color: COLORS.textMuted,
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
            formatter: (params: unknown) => {
              const p = params as { value: number };
              return valueFormatter(p.value);
            },
            position: primaryLabelPosition,
            fontSize: 11,
            color: primaryColor,
          },
          // The horizontal reference (CPI/SPI baseline at yAxis=1.0)
          // uses the canonical `referenceMarkLine` helper so it stays
          // visually coherent with the vertical "Latest" marker below
          // — both share the same muted-gray dashed/width-1 shape.
          markLine:
            referenceLine === null
              ? undefined
              : referenceMarkLine({
                  axis: 'yAxis',
                  value: referenceLine,
                  label: valueFormatter(referenceLine),
                }),
        },
        {
          name: secondaryLabel,
          type: 'line',
          data: secondaryData,
          symbol: 'circle',
          symbolSize: 8,
          label: {
            show: true,
            formatter: (params: unknown) => {
              const p = params as { value: number };
              return valueFormatter(p.value);
            },
            position: secondaryLabelPosition,
            fontSize: 11,
            color: secondaryColor,
          },
          // "Latest" guide via the shared sugar — same label, color,
          // lineWidth, and silent override that the helper bakes in.
          markLine: latestMarkLine(lastIndex),
        },
      ],
    };
  }, [
    data,
    primaryLabel,
    secondaryLabel,
    primaryColor,
    secondaryColor,
    referenceLine,
    yMin,
    yMax,
    valueFormatter,
    primaryLabelPosition,
    secondaryLabelPosition,
    markLatestPoint,
  ]);

  return <EChartsWrapper option={option} height={height} />;
}
