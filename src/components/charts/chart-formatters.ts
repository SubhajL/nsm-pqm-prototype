/**
 * PR-A4 — shared chart formatters.
 *
 * All ECharts tooltip and axis-label number formatting funnels through
 * this module so every chart shows the same Thai-locale strings ("฿1.2M",
 * "65%", "850K") with a single place to localise.
 *
 * Implementation notes:
 *   - The four `Intl.NumberFormat('th-TH', …)` instances are cached at
 *     module scope. ECharts can re-invoke an axis formatter dozens of
 *     times per render; allocating an Intl on every call shows up as
 *     measurable GC pressure on the S-curve / heatmap screens.
 *   - All formatters return strings, never ReactNode, so they're safe
 *     to pass into ECharts option fragments that get serialised to the
 *     ECharts model layer.
 *   - Non-finite input (`NaN`, `±Infinity`) collapses to "-" — ECharts
 *     would otherwise render the literal "NaN" in tooltips.
 */

const compactFormatter = new Intl.NumberFormat('th-TH', {
  notation: 'compact',
  compactDisplay: 'short',
  maximumFractionDigits: 1,
});

const integerFormatter = new Intl.NumberFormat('th-TH', {
  maximumFractionDigits: 0,
});

const percentIntegerFormatter = new Intl.NumberFormat('th-TH', {
  maximumFractionDigits: 0,
});

const percentDecimalFormatter = new Intl.NumberFormat('th-TH', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

const bahtFullFormatter = new Intl.NumberFormat('th-TH', {
  style: 'currency',
  currency: 'THB',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

/**
 * Compact th-TH suffix for a non-negative finite number.
 * Negative sign + bare value is the caller's responsibility so the ฿
 * prefix lands in the right place (e.g. "-฿1.2M").
 */
function compactAbs(value: number): string {
  const abs = Math.abs(value);
  if (abs < 1_000) {
    return integerFormatter.format(abs);
  }
  return compactFormatter.format(abs);
}

/**
 * Format a Baht value: "฿1.2M", "฿850K", "฿12,500".
 * Negative values render as "-฿X" so the sign reads before the symbol.
 */
export function formatBaht(value: number): string {
  if (!Number.isFinite(value)) return '-';
  const sign = value < 0 ? '-' : '';
  return `${sign}฿${compactAbs(value)}`;
}

/**
 * Format a percentage. Accepts either a fraction (`0.65 → "65%"`) OR an
 * already-scaled percentage (`65 → "65%"`). The disambiguation rule:
 * absolute value ≤ 1 is treated as a fraction. Variance series can
 * legitimately exceed ±1, so callers needing to force fraction-mode
 * should multiply by 100 before passing in.
 */
export function formatPercent(value: number): string {
  if (!Number.isFinite(value)) return '-';
  const scaled = Math.abs(value) <= 1 ? value * 100 : value;
  // Use one-decimal precision unless the rounded value is integer-clean.
  const rounded = Math.round(scaled * 10) / 10;
  const formatter = Number.isInteger(rounded)
    ? percentIntegerFormatter
    : percentDecimalFormatter;
  return `${formatter.format(rounded)}%`;
}

/**
 * Format a Baht value at full precision: "฿12,500,000".
 * Pair with `formatBaht` (compact axis labels) — use this in tooltips
 * where the reader needs the exact number, not the suffixed form.
 */
export function formatBahtFull(value: number): string {
  if (!Number.isFinite(value)) return '-';
  return bahtFullFormatter.format(value);
}

/**
 * Compact Thai-locale number — same suffixing as formatBaht but with
 * no currency prefix. Use for counts, headcount, kg, etc.
 */
export function formatThaiCompact(value: number): string {
  if (!Number.isFinite(value)) return '-';
  const sign = value < 0 ? '-' : '';
  return `${sign}${compactAbs(value)}`;
}

/**
 * Cross-chart cleanup sweep — shared tooltip formatter factory.
 *
 * Every `trigger: 'axis'` line chart in `src/components/charts/`
 * hand-rolled the same three-step closure: pull `axisValueLabel`
 * off the first item, render a `<strong>header</strong>`, then map
 * each item to `${marker} ${seriesName}: ${formatted-value}` and
 * join with `<br/>`. This factory encodes that pattern once.
 *
 * Pass `filter` to drop hidden helper series (e.g. invisible
 * stack-band series whose names should never appear to the user).
 * When the (filtered) row set is empty, the formatter returns the
 * empty string — ECharts then shows no tooltip box at all, instead
 * of an empty whitespace popup.
 */
export interface AxisTooltipRow {
  seriesName: string;
  value: number;
  marker: string;
  axisValueLabel?: string;
}

export interface AxisTooltipOptions {
  /** Per-item value renderer (e.g. `formatBaht`, `formatPercent`). */
  valueFormat: (value: number) => string;
  /**
   * Optional predicate to drop hidden helper rows before formatting.
   * Returning `false` suppresses the row.
   */
  filter?: (row: AxisTooltipRow) => boolean;
}

export function axisTooltipFormatter(
  opts: AxisTooltipOptions,
): (params: unknown) => string {
  return (params: unknown) => {
    if (!Array.isArray(params)) return '';
    const rows = params as AxisTooltipRow[];
    const visible = opts.filter ? rows.filter(opts.filter) : rows;
    if (visible.length === 0) return '';
    const header = visible[0]?.axisValueLabel
      ? `<strong>${visible[0].axisValueLabel}</strong><br/>`
      : '';
    const lines = visible
      .map((row) => `${row.marker} ${row.seriesName}: ${opts.valueFormat(row.value)}`)
      .join('<br/>');
    return header + lines;
  };
}

/**
 * Factory used by axis-label config. Returns a closure that ECharts
 * can invoke per tick label.
 */
export function makeAxisLabelFormatter(
  unit: 'baht' | 'percent' | 'count',
): (v: number) => string {
  switch (unit) {
    case 'baht':
      return formatBaht;
    case 'percent':
      return formatPercent;
    case 'count':
    default:
      return formatThaiCompact;
  }
}
