'use client';

import { Segmented } from 'antd';

/**
 * Tier 2 follow-up — generic KPI Segmented filter primitive.
 *
 * Promoted from `dashboard/_components/DashboardFilterSegmented` per
 * the `common/CLAUDE.md` rule: "if a row of KPIs needs a filter
 * affordance, render an AntD `<Segmented>` selector above the row…".
 * Any future status-partitioned screen (executive overview,
 * portfolio rollups, RID dashboards) can adopt this primitive
 * instead of re-rolling a bespoke wrapper.
 *
 * Generic over `T extends string` — callers parameterise with their
 * own status union (e.g. `DashboardStatusFilter`,
 * `PortfolioFilter`). The `value`/`onChange` types stay narrow at
 * the callsite; the runtime narrow inside `onChange` defends
 * against future drift between the typed union and the option list.
 */
export interface KpiSegmentedOption<T extends string> {
  value: T;
  label: string;
  /** Optional live count rendered as `${label} · ${count}`. */
  count?: number;
  /** Disable the option (e.g. when count is zero by design). */
  disabled?: boolean;
}

export interface KpiSegmentedFilterProps<T extends string> {
  value: T;
  onChange: (next: T) => void;
  options: ReadonlyArray<KpiSegmentedOption<T>>;
  /** Bilingual aria-label for the surrounding `<div role="region">`. */
  ariaLabel: string;
  size?: 'small' | 'middle' | 'large';
  /** Outer `marginBottom`. Defaults to `24` (the page vertical rhythm). */
  marginBottom?: number;
}

export function KpiSegmentedFilter<T extends string>({
  value,
  onChange,
  options,
  ariaLabel,
  size = 'large',
  marginBottom = 24,
}: KpiSegmentedFilterProps<T>) {
  // Runtime narrow protects against future drift between the typed
  // `T` union and the option array — TS can't trace which strings
  // ECharts/AntD eventually emit, so the option list is the source
  // of truth at runtime.
  const validValues = new Set<string>(options.map((o) => o.value));

  const segmentedOptions = options.map((o) => ({
    value: o.value,
    label: o.count !== undefined ? `${o.label} · ${o.count}` : o.label,
    disabled: o.disabled,
  }));

  return (
    <div role="region" aria-label={ariaLabel} style={{ marginBottom }}>
      <Segmented
        size={size}
        value={value}
        onChange={(next) => {
          if (typeof next === 'string' && validValues.has(next)) {
            onChange(next as T);
          }
        }}
        options={segmentedOptions}
      />
    </div>
  );
}
