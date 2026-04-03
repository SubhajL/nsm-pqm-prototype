'use client';

import type { EChartsOption } from 'echarts';
import { CHART_COLORS } from '@/theme/antd-theme';
import { EChartsWrapper } from './EChartsWrapper';

interface DonutDataItem {
  name: string;
  value: number;
}

interface ProjectDonutChartProps {
  data: DonutDataItem[];
  height?: number;
}

const PALETTE = [
  CHART_COLORS.primary,
  CHART_COLORS.teal,
  CHART_COLORS.info,
  CHART_COLORS.warning,
  CHART_COLORS.error,
  CHART_COLORS.success,
];

export function ProjectDonutChart({ data, height = 350 }: ProjectDonutChartProps) {
  const option: EChartsOption = {
    tooltip: {
      trigger: 'item',
      formatter: (params: unknown) => {
        const p = params as { name: string; value: number; percent: number };
        return `${p.name}: ${p.value} (${p.percent}%)`;
      },
    },
    legend: {
      orient: 'horizontal',
      bottom: 0,
      left: 'center',
    },
    color: PALETTE,
    series: [
      {
        type: 'pie',
        radius: ['50%', '70%'],
        center: ['50%', '45%'],
        avoidLabelOverlap: true,
        itemStyle: {
          borderRadius: 6,
          borderColor: '#fff',
          borderWidth: 2,
        },
        label: {
          show: true,
          formatter: '{b}\n{d}%',
          fontSize: 12,
        },
        labelLine: {
          show: true,
        },
        data,
      },
    ],
  };

  return <EChartsWrapper option={option} height={height} />;
}
