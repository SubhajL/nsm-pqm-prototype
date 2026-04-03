'use client';

import type { EChartsOption } from 'echarts';
import { CHART_COLORS } from '@/theme/antd-theme';
import { EChartsWrapper } from './EChartsWrapper';

interface DepartmentStatus {
  department: string;
  onSchedule: number;
  watch: number;
  delayed: number;
  planning: number;
  completed: number;
}

interface PortfolioBarChartProps {
  data: DepartmentStatus[];
  height?: number;
}

export function PortfolioBarChart({ data, height = 350 }: PortfolioBarChartProps) {
  const departments = data.map((d) => d.department);

  const option: EChartsOption = {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
    },
    legend: {
      bottom: 0,
      data: [
        'ตามแผน (On Schedule)',
        'เฝ้าระวัง (Watch)',
        'ล่าช้า (Delayed)',
        'วางแผน (Planning)',
        'เสร็จสิ้น (Completed)',
      ],
    },
    grid: {
      left: 160,
      right: 24,
      top: 12,
      bottom: 48,
      containLabel: false,
    },
    xAxis: {
      type: 'value',
      minInterval: 1,
    },
    yAxis: {
      type: 'category',
      data: departments,
      axisLabel: {
        width: 140,
        overflow: 'truncate',
      },
    },
    series: [
      {
        name: 'ตามแผน (On Schedule)',
        type: 'bar',
        stack: 'status',
        color: CHART_COLORS.teal,
        data: data.map((d) => d.onSchedule),
        barMaxWidth: 28,
      },
      {
        name: 'เฝ้าระวัง (Watch)',
        type: 'bar',
        stack: 'status',
        color: CHART_COLORS.watch,
        data: data.map((d) => d.watch),
        barMaxWidth: 28,
      },
      {
        name: 'ล่าช้า (Delayed)',
        type: 'bar',
        stack: 'status',
        color: CHART_COLORS.delayed,
        data: data.map((d) => d.delayed),
        barMaxWidth: 28,
      },
      {
        name: 'วางแผน (Planning)',
        type: 'bar',
        stack: 'status',
        color: CHART_COLORS.planning,
        data: data.map((d) => d.planning),
        barMaxWidth: 28,
      },
      {
        name: 'เสร็จสิ้น (Completed)',
        type: 'bar',
        stack: 'status',
        color: CHART_COLORS.completed,
        data: data.map((d) => d.completed),
        barMaxWidth: 28,
      },
    ],
  };

  return <EChartsWrapper option={option} height={height} />;
}
