/**
 * PR-A4 — chart option-fragment helpers.
 *
 * The S-curve, EVM trend, and any Gantt-overlay variants all need the
 * same two bits of UI: a vertical "today" guide line and a bilingual
 * legend computed from `{ thai, english }` series labels. Centralising
 * them here means a future copy tweak (e.g. swap "Today" → "วันนี้") is
 * a one-file edit, and every consumer inherits the change.
 *
 * Both functions are pure and return plain objects shaped for ECharts'
 * option model. The return types are deliberately `object` rather than
 * the deeply-narrowed ECharts internals; the consumer drops the
 * fragment into the relevant slot (`series[N].markLine`, `legend.data`)
 * and the ECharts type checker resolves the rest.
 */

export interface TodayMarkLineOptions {
  /**
   * Bilingual label rendered at the top of the vertical guide. Defaults
   * to "วันนี้ (Today)" — keep the `Thai (English)` format used across
   * the rest of the shell.
   */
  label?: string;
  /**
   * Applied uniformly to both the line stroke and the label text. When
   * omitted, the line + label inherit the chart's defaults (series
   * color for the line, theme text color for the label).
   */
  color?: string;
  /**
   * Label fontWeight. Defaults to normal (ECharts default). Set to
   * `'bold'` for a primary marker that needs to stand out against
   * decorative reference lines on the same chart.
   */
  labelFontWeight?: 'normal' | 'bold' | number;
  /**
   * Line stroke width. Defaults to `2` to match the S-curve "Latest"
   * marker. Set to `1` for a subtler line (e.g. the EVM CPI/SPI
   * trend's "Latest" marker, where the line should not compete with
   * a sibling reference line at the same emphasis).
   */
  lineWidth?: number;
}

/**
 * Returns a `markLine` fragment representing the "today" vertical guide.
 * The consumer wires it onto a series via
 *   `series[N].markLine = { ...todayMarkLine(), ... }`.
 *
 * The `xAxis: 'today'` slot is symbolic — the consuming chart must
 * either translate it (via `markLine.data[0].xAxis = currentTickIndex`)
 * or rely on ECharts' axis-name resolution. Leaving the placeholder
 * makes the fragment self-describing for code reviewers.
 */
export function todayMarkLine(opts: TodayMarkLineOptions = {}): object {
  const label = opts.label ?? 'วันนี้ (Today)';
  return {
    symbol: 'none',
    label: {
      formatter: label,
      position: 'insideEndTop',
      fontSize: 11,
      ...(opts.color !== undefined ? { color: opts.color } : {}),
      ...(opts.labelFontWeight !== undefined
        ? { fontWeight: opts.labelFontWeight }
        : {}),
    },
    lineStyle: {
      type: 'dashed',
      width: opts.lineWidth ?? 2,
      ...(opts.color !== undefined ? { color: opts.color } : {}),
    },
    data: [{ xAxis: 'today' }],
  };
}

export interface BilingualSeriesName {
  thai: string;
  english: string;
}

/**
 * Renders a legend `data` array from a list of bilingual series names.
 * Output entries match the `name` of the corresponding series so
 * ECharts can link legend visibility toggles back to the series.
 *
 * The bilingual format is `"<thai> (<english>)"` per the rest of the
 * shell (badges, nav aria-labels, etc.).
 */
export function baselineLegend(
  seriesNames: readonly BilingualSeriesName[],
): { name: string }[] {
  return seriesNames.map((s) => ({ name: `${s.thai} (${s.english})` }));
}
