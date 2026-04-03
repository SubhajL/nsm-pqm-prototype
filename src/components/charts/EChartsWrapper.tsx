'use client';

import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';

interface EChartsWrapperProps {
  option: EChartsOption;
  height?: number;
  className?: string;
  loading?: boolean;
}

export function EChartsWrapper({
  option,
  height = 400,
  className,
  loading,
}: EChartsWrapperProps) {
  return (
    <ReactECharts
      option={option}
      style={{ height }}
      className={className}
      notMerge={true}
      lazyUpdate={true}
      showLoading={loading}
    />
  );
}
