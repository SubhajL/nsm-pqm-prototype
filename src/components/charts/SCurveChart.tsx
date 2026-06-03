'use client';

import { useMemo } from 'react';
import type { EChartsOption } from 'echarts';

import { CHART_COLORS, COLORS } from '@/theme/antd-theme';

import {
  MONTHLY_LINE_GRID,
  monthlyCategoryAxis,
  topLegend,
} from './chart-defaults';
import { LATEST_MARKER_LABEL, todayMarkLine } from './chart-helpers';
import {
  axisTooltipFormatter,
  formatBaht,
  formatBahtFull,
} from './chart-formatters';
import { EChartsWrapper } from './EChartsWrapper';

interface SCurveDataPoint {
  monthThai: string;
  pv: number;
  ev: number;
  actual: number;
}

interface SCurveChartProps {
  data: SCurveDataPoint[];
  height?: number;
  actualSeriesLabel?: string;
}

export function SCurveChart({
  data,
  height = 350,
  actualSeriesLabel = 'AC — ค่าใช้จ่ายจริง (Actual)',
}: SCurveChartProps) {
  const option: EChartsOption = useMemo(() => {
    const months = data.map((d) => d.monthThai);
    const pvData = data.map((d) => d.pv);
    const evData = data.map((d) => d.ev);
    const actualData = data.map((d) => d.actual);
    const lastIndex = data.length - 1;

    const seriesNames = [
      'PV — แผนงาน (Plan)',
      'EV — มูลค่าที่ได้ (Earned)',
      actualSeriesLabel,
    ];

    return {
      color: [CHART_COLORS.pv, CHART_COLORS.ev, CHART_COLORS.ac],
      tooltip: {
        // Full-precision Baht in tooltips (`฿12,500,000`) so financial
        // review can read exact figures; axis ticks stay compact
        // (`฿12.5M`) to avoid crowding the y-axis gutter.
        trigger: 'axis',
        formatter: axisTooltipFormatter({ valueFormat: formatBahtFull }),
      },
      legend: topLegend(seriesNames),
      grid: { ...MONTHLY_LINE_GRID, right: 40, left: 60 },
      xAxis: monthlyCategoryAxis(months),
      yAxis: {
        type: 'value',
        axisLabel: {
          formatter: (value: number) => formatBaht(value),
          color: COLORS.textMuted,
        },
      },
      series: [
        {
          name: seriesNames[0],
          type: 'line',
          data: pvData,
          smooth: true,
          lineStyle: { type: 'dashed', width: 2 },
          symbol: 'circle',
          symbolSize: 6,
          // PR-C3: visualise schedule variance as a light area between PV
          // and EV — the upper bound. Lower bound (EV) is set on the EV
          // series via `stack` would clip data; we use a stackStrategy of
          // `samesign` so each point's fill clamps at the lower curve.
          areaStyle: { opacity: 0.08, color: CHART_COLORS.pv },
        },
        {
          name: seriesNames[1],
          type: 'line',
          data: evData,
          smooth: true,
          lineStyle: { width: 2 },
          symbol: 'circle',
          symbolSize: 6,
        },
        {
          name: seriesNames[2],
          type: 'line',
          data: actualData,
          smooth: true,
          lineStyle: { width: 2 },
          symbol: 'circle',
          symbolSize: 6,
          // PR-C3 + G22: bilingual marker label, dashed style, and
          // colour/fontWeight emphasis flow from the shared helper.
          // Override only `data` to swap the helper's `'today'` xAxis
          // placeholder for our `lastIndex` (the marker is on the
          // ACTUAL line, not a "Latest" guide, so it does not share
          // the `latestMarkLine` sugar).
          markLine: {
            ...todayMarkLine({
              label: LATEST_MARKER_LABEL,
              color: CHART_COLORS.error,
              labelFontWeight: 'bold',
            }),
            data: [{ xAxis: lastIndex }],
          },
        },
      ],
    };
  }, [data, actualSeriesLabel]);

  return <EChartsWrapper option={option} height={height} />;
}
