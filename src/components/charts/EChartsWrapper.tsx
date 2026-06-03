'use client';

import { useMemo, type DependencyList } from 'react';
import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';

import { getChartBaseOption } from './chart-defaults';

/**
 * `useMemo` aliased for chart option builders. Centralises the
 * `const option = useMemo(() => ({ ... }), [deps])` pattern that every
 * chart component repeats so future tweaks (e.g. deeper caching,
 * dev-mode rebuild-counter, profiler instrumentation) live in one place.
 *
 * Note: `react-hooks/exhaustive-deps` is configured with
 * `additionalHooks: '(useChartOption)'` in `.eslintrc.json` so every
 * caller's `deps` array is still lint-checked — the custom name does
 * NOT silently disable the dep-completeness guarantee that vanilla
 * `useMemo` provides.
 */
export function useChartOption(
  buildOption: () => EChartsOption,
  deps: DependencyList,
): EChartsOption {
  // The helper itself relies on its caller's `deps` to fully cover the
  // closure captured by `buildOption`. Caller-site dep completeness is
  // enforced by `additionalHooks: '(useChartOption)'` in .eslintrc.json
  // — see the JSDoc above.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(buildOption, deps);
}

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
