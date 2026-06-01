/**
 * P-D1 — Live ฿ formatter for AntD `<InputNumber>`.
 *
 * Use as:
 *   <InputNumber
 *     formatter={formatBahtLive}
 *     parser={parseBahtLive}
 *   />
 *
 * The formatter emits a Thai-locale-grouped string with a leading ฿
 * symbol (`฿1,234`). The parser strips ฿ + commas so the InputNumber
 * value remains a plain number. Both helpers are pure (no React, no
 * Intl side effects).
 */

const THAI_NUMBER_FORMATTER = new Intl.NumberFormat('th-TH', {
  maximumFractionDigits: 2,
  minimumFractionDigits: 0,
});

export function formatBahtLive(value: number | string | undefined): string {
  if (value === undefined || value === null || value === '') return '';
  const num = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(num)) return '';
  return `฿${THAI_NUMBER_FORMATTER.format(num)}`;
}

export function parseBahtLive(value: string | undefined): string {
  if (!value) return '';
  // Strip the currency symbol + grouping separators. Keep the leading
  // minus sign, decimal point, and digits.
  return value.replace(/[฿\s,]/g, '');
}
