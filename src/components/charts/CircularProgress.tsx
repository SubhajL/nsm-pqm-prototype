'use client';

import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';
import { CHART_COLORS, COLORS, PROJECT_STATUS_COLORS } from '@/theme/antd-theme';

interface CircularProgressProps {
  percent: number;
  size?: number;
  color?: string;
}

export function CircularProgress({
  percent,
  size = 160,
  color = CHART_COLORS.teal,
}: CircularProgressProps) {
  const formattedPercent = new Intl.NumberFormat('th-TH', {
    minimumFractionDigits: Number.isInteger(percent) ? 0 : 1,
    maximumFractionDigits: 1,
  }).format(percent);

  const option: EChartsOption = {
    series: [
      {
        type: 'gauge',
        startAngle: 225,
        endAngle: -45,
        radius: '90%',
        center: ['50%', '50%'],
        min: 0,
        max: 100,
        progress: {
          show: true,
          width: 14,
          roundCap: true,
          itemStyle: {
            color,
          },
        },
        pointer: {
          show: false,
        },
        axisLine: {
          lineStyle: {
            width: 14,
            color: [[1, '#F0F0F0']],
          },
          roundCap: true,
        },
        axisTick: {
          show: false,
        },
        splitLine: {
          show: false,
        },
        axisLabel: {
          show: false,
        },
        title: { show: false },
        detail: { show: false },
        data: [
          {
            value: percent,
            name: 'ความคืบหน้า',
          },
        ],
      },
    ],
  };

  return (
    <div
      aria-label={`ความคืบหน้า ${formattedPercent}%`}
      role="img"
      style={{ position: 'relative', height: size, width: size }}
    >
      <ReactECharts
        option={option}
        style={{ height: size, width: size }}
        notMerge={true}
        lazyUpdate={true}
      />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          pointerEvents: 'none',
        }}
      >
        <div style={{ textAlign: 'center', lineHeight: 1.1 }}>
          <div
            style={{
              color: COLORS.textDark,
              fontSize: size * 0.2,
              fontWeight: 700,
            }}
          >
            {formattedPercent}%
          </div>
          <div
            style={{
              color: PROJECT_STATUS_COLORS.onHold,
              fontSize: 12,
              marginTop: 4,
            }}
          >
            ความคืบหน้า
          </div>
        </div>
      </div>
    </div>
  );
}
