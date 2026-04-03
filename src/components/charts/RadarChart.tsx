'use client';

import { EChartsWrapper } from './EChartsWrapper';
import type { EChartsOption } from 'echarts';
import { CHART_COLORS } from '@/theme/antd-theme';

interface RadarDataItem {
  dimension: string;
  score: number;
}

interface RadarChartProps {
  data: RadarDataItem[];
  maxScore?: number;
  height?: number;
}

export function RadarChart({ data, maxScore = 5, height = 300 }: RadarChartProps) {
  const option: EChartsOption = {
    tooltip: {
      trigger: 'item',
      formatter: (params: unknown) => {
        const p = params as { value: number[]; name: string };
        const values = p.value;
        return data
          .map((item, i) => `${item.dimension}: ${values[i]} / ${maxScore}`)
          .join('<br/>');
      },
    },
    radar: {
      shape: 'circle',
      indicator: data.map((item) => ({
        name: item.dimension,
        max: maxScore,
      })),
      axisName: {
        color: '#333',
        fontSize: 12,
      },
      splitArea: {
        areaStyle: {
          color: ['#fff', '#f5f5f5', '#fff', '#f5f5f5', '#fff'],
        },
      },
    },
    series: [
      {
        type: 'radar',
        data: [
          {
            value: data.map((item) => item.score),
            name: 'Score',
            areaStyle: {
              color: CHART_COLORS.teal,
              opacity: 0.3,
            },
            lineStyle: {
              color: CHART_COLORS.teal,
              width: 2,
            },
            itemStyle: {
              color: CHART_COLORS.teal,
            },
          },
        ],
      },
    ],
  };

  return <EChartsWrapper option={option} height={height} />;
}
