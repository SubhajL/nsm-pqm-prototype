'use client';

import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';
import { CHART_COLORS } from '@/theme/antd-theme';
import { todayMarkLine } from './chart-helpers';

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

function formatBaht(value: number): string {
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1)}M`;
  }
  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(0)}K`;
  }
  return String(value);
}

function formatBahtFull(value: number): string {
  return new Intl.NumberFormat('th-TH', {
    style: 'currency',
    currency: 'THB',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export function SCurveChart({
  data,
  height = 350,
  actualSeriesLabel = 'AC — ค่าใช้จ่ายจริง (Actual)',
}: SCurveChartProps) {
  const months = data.map((d) => d.monthThai);
  const pvData = data.map((d) => d.pv);
  const evData = data.map((d) => d.ev);
  const actualData = data.map((d) => d.actual);

  const lastIndex = data.length - 1;

  const option: EChartsOption = {
    color: [CHART_COLORS.pv, CHART_COLORS.ev, CHART_COLORS.ac],
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
          .map((item) => `${item.marker} ${item.seriesName}: ${formatBahtFull(item.value)}`)
          .join('<br/>');
        return header + lines;
      },
    },
    legend: {
      top: 0,
      data: [
        'PV — แผนงาน (Plan)',
        'EV — มูลค่าที่ได้ (Earned)',
        actualSeriesLabel,
      ],
    },
    grid: {
      top: 50,
      right: 40,
      bottom: 30,
      left: 60,
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
      axisLabel: {
        formatter(value: number) {
          return formatBaht(value);
        },
      },
    },
    series: [
      {
        name: 'PV — แผนงาน (Plan)',
        type: 'line',
        data: pvData,
        smooth: true,
        lineStyle: {
          type: 'dashed',
          width: 2,
        },
        symbol: 'circle',
        symbolSize: 6,
        // PR-C3: visualise schedule variance as a light area between PV
        // and EV — the upper bound. Lower bound (EV) is set on the EV
        // series via `stack` would clip data; we use a stackStrategy of
        // `samesign` so each point's fill clamps at the lower curve.
        areaStyle: {
          opacity: 0.08,
          color: CHART_COLORS.pv,
        },
      },
      {
        name: 'EV — มูลค่าที่ได้ (Earned)',
        type: 'line',
        data: evData,
        smooth: true,
        lineStyle: {
          width: 2,
        },
        symbol: 'circle',
        symbolSize: 6,
      },
      {
        name: actualSeriesLabel,
        type: 'line',
        data: actualData,
        smooth: true,
        lineStyle: {
          width: 2,
        },
        symbol: 'circle',
        symbolSize: 6,
        // PR-C3 + G22: adopt the chart-helpers `todayMarkLine` helper so
        // the bilingual marker label, dashed style, and color/fontWeight
        // emphasis flow from one source. Override only `data` to swap
        // the helper's `'today'` xAxis placeholder for our `lastIndex`.
        markLine: {
          ...todayMarkLine({
            label: 'ข้อมูลงวดล่าสุด (Latest)',
            color: CHART_COLORS.error,
            labelFontWeight: 'bold',
          }),
          data: [{ xAxis: lastIndex }],
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
