'use client';

import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';

import { getChartBaseOption } from './chart-defaults';

interface EChartsWrapperProps {
  option: EChartsOption;
  height?: number;
  className?: string;
  loading?: boolean;
}

/**
 * Shallow-merge the PR-A4 baseline (aria + decal + AA-safe axis labels)
 * under the consumer's option so explicit settings still win. Nested
 * `aria` is merged one level deep so a consumer can override `decal`
 * without losing `enabled: true` (or vice-versa).
 */
function withBaseOption(option: EChartsOption): EChartsOption {
  const base = getChartBaseOption();
  const mergedAria = {
    ...(base.aria as object | undefined),
    ...(option.aria as object | undefined),
  };
  return {
    ...base,
    ...option,
    aria: mergedAria as EChartsOption['aria'],
  };
}

export function EChartsWrapper({
  option,
  height = 400,
  className,
  loading,
}: EChartsWrapperProps) {
  return (
    <ReactECharts
      option={withBaseOption(option)}
      style={{ height }}
      className={className}
      notMerge={true}
      lazyUpdate={true}
      showLoading={loading}
    />
  );
}
