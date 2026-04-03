'use client';

import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';
import { CHART_COLORS } from '@/theme/antd-theme';
import type { Risk } from '@/types/risk';

interface RiskHeatMapProps {
  risks: Risk[];
  height?: number;
}

export function RiskHeatMap({ risks, height = 400 }: RiskHeatMapProps) {
  const likelihoodLabels = ['น้อยมาก', 'น้อย', 'ปานกลาง', 'สูง', 'สูงมาก'];
  const impactLabels = ['น้อยมาก', 'น้อย', 'ปานกลาง', 'สูง', 'รุนแรงมาก'];

  // Build 5x5 heatmap background data
  const heatmapData: [number, number, number][] = [];
  for (let x = 0; x < 5; x++) {
    for (let y = 0; y < 5; y++) {
      const score = (x + 1) * (y + 1);
      heatmapData.push([x, y, score]);
    }
  }

  // Build scatter data for risk positions
  const scatterData = risks
    .filter((r) => r.status !== 'closed')
    .map((r) => ({
      value: [r.likelihood - 1, r.impact - 1],
      name: r.id,
      riskTitle: r.title,
      riskScore: r.score,
    }));

  const option: EChartsOption = {
    tooltip: {
      trigger: 'item',
      formatter: (params: unknown) => {
        const p = params as { data?: { name?: string; riskTitle?: string; riskScore?: number; value?: number[] }; value?: number[] };
        if (p.data && p.data.riskTitle) {
          return `<strong>${p.data.name}</strong><br/>${p.data.riskTitle}<br/>Score: ${p.data.riskScore}`;
        }
        if (p.value && Array.isArray(p.value) && p.value.length >= 3) {
          const score = p.value[2];
          return `${likelihoodLabels[p.value[0]]} x ${impactLabels[p.value[1]]}<br/>Score: ${score}`;
        }
        return '';
      },
    },
    grid: {
      left: 100,
      right: 40,
      top: 30,
      bottom: 80,
    },
    xAxis: {
      type: 'category',
      data: likelihoodLabels,
      name: 'โอกาสเกิด (Likelihood)',
      nameLocation: 'middle',
      nameGap: 50,
      nameTextStyle: { fontSize: 13, fontWeight: 'bold' },
      splitArea: { show: true },
      axisLabel: { fontSize: 11 },
    },
    yAxis: {
      type: 'category',
      data: impactLabels,
      name: 'ผลกระทบ (Impact)',
      nameLocation: 'middle',
      nameGap: 70,
      nameTextStyle: { fontSize: 13, fontWeight: 'bold' },
      splitArea: { show: true },
      axisLabel: { fontSize: 11 },
    },
    visualMap: {
      min: 1,
      max: 25,
      show: false,
      inRange: {
        color: ['#27AE60', '#F1C40F', '#E67E22', '#E74C3C'],
      },
      pieces: [
        { min: 1, max: 4, color: '#27AE60' },
        { min: 5, max: 9, color: '#F1C40F' },
        { min: 10, max: 15, color: '#E67E22' },
        { min: 16, max: 25, color: '#E74C3C' },
      ],
      type: 'piecewise',
    },
    series: [
      {
        name: 'Risk Matrix',
        type: 'heatmap',
        data: heatmapData,
        label: {
          show: true,
          formatter: (params: unknown) => {
            const p = params as { value: number[] };
            return String(p.value[2]);
          },
          fontSize: 12,
          color: '#fff',
          fontWeight: 'bold',
        },
        itemStyle: {
          borderColor: '#fff',
          borderWidth: 2,
        },
        emphasis: {
          itemStyle: {
            shadowBlur: 10,
            shadowColor: 'rgba(0, 0, 0, 0.5)',
          },
        },
      },
      {
        name: 'Risks',
        type: 'scatter',
        data: scatterData,
        symbolSize: 28,
        z: 10,
        itemStyle: {
          color: '#fff',
          borderColor: CHART_COLORS.primary,
          borderWidth: 2,
          shadowBlur: 4,
          shadowColor: 'rgba(0,0,0,0.3)',
        },
        label: {
          show: true,
          formatter: (params: unknown) => {
            const p = params as { data: { name: string } };
            return p.data.name;
          },
          fontSize: 9,
          fontWeight: 'bold',
          color: CHART_COLORS.primary,
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
