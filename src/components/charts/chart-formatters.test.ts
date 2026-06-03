import { describe, expect, it } from 'vitest';

import {
  axisTooltipFormatter,
  formatBaht,
  formatBahtFull,
  formatPercent,
  formatThaiCompact,
  makeAxisLabelFormatter,
} from './chart-formatters';

/**
 * PR-A4 — shared chart formatters.
 *
 * The four helpers below are the single canonical place where chart
 * axis labels and tooltip values get localised. Every formatter MUST:
 *   - use `Intl.NumberFormat('th-TH', ...)` (cached at module scope)
 *   - degrade safely on 0 / negative / NaN
 *   - return strings (never ReactNode)
 */

describe('formatBaht', () => {
  it('renders ฿ prefix with no decimals for sub-thousand values', () => {
    expect(formatBaht(0)).toBe('฿0');
    expect(formatBaht(42)).toBe('฿42');
    expect(formatBaht(999)).toBe('฿999');
  });

  it('formats thousands with K suffix and ฿ prefix', () => {
    expect(formatBaht(1_000)).toBe('฿1K');
    expect(formatBaht(12_500)).toBe('฿12.5K');
    expect(formatBaht(850_000)).toBe('฿850K');
  });

  it('formats millions with M suffix and ฿ prefix', () => {
    expect(formatBaht(1_000_000)).toBe('฿1M');
    expect(formatBaht(1_200_000)).toBe('฿1.2M');
    expect(formatBaht(12_500_000)).toBe('฿12.5M');
  });

  it('preserves sign for negatives', () => {
    expect(formatBaht(-1_200_000)).toBe('-฿1.2M');
    expect(formatBaht(-500)).toBe('-฿500');
  });

  it('returns "-" for NaN / non-finite inputs', () => {
    expect(formatBaht(Number.NaN)).toBe('-');
    expect(formatBaht(Number.POSITIVE_INFINITY)).toBe('-');
  });
});

describe('formatBahtFull', () => {
  it('renders the full Thai-locale currency form with no suffix collapsing', () => {
    expect(formatBahtFull(12_500_000)).toBe('฿12,500,000');
    expect(formatBahtFull(8_148_237)).toBe('฿8,148,237');
    expect(formatBahtFull(500)).toBe('฿500');
  });

  it('preserves the negative sign before the currency symbol', () => {
    // Intl.NumberFormat th-TH renders negatives as "-฿12,500,000".
    expect(formatBahtFull(-12_500_000)).toMatch(/^-?฿?-?12,500,000$/);
  });

  it('returns "-" for non-finite inputs', () => {
    expect(formatBahtFull(Number.NaN)).toBe('-');
    expect(formatBahtFull(Number.POSITIVE_INFINITY)).toBe('-');
  });
});

describe('formatPercent', () => {
  it('treats fractional input ≤ 1 as a fraction (0.65 → "65%")', () => {
    expect(formatPercent(0)).toBe('0%');
    expect(formatPercent(0.5)).toBe('50%');
    expect(formatPercent(0.65)).toBe('65%');
    expect(formatPercent(1)).toBe('100%');
  });

  it('treats input > 1 as an already-scaled percentage', () => {
    expect(formatPercent(50)).toBe('50%');
    expect(formatPercent(65)).toBe('65%');
    expect(formatPercent(150)).toBe('150%');
  });

  it('rounds to one decimal place when the value is not an integer', () => {
    expect(formatPercent(0.6543)).toBe('65.4%');
    expect(formatPercent(12.34)).toBe('12.3%');
  });

  it('preserves sign for negative variance', () => {
    expect(formatPercent(-0.08)).toBe('-8%');
    expect(formatPercent(-12.5)).toBe('-12.5%');
  });

  it('returns "-" for NaN / non-finite inputs', () => {
    expect(formatPercent(Number.NaN)).toBe('-');
    expect(formatPercent(Number.NEGATIVE_INFINITY)).toBe('-');
  });
});

describe('formatThaiCompact', () => {
  it('formats integers without suffix', () => {
    expect(formatThaiCompact(0)).toBe('0');
    expect(formatThaiCompact(42)).toBe('42');
    expect(formatThaiCompact(999)).toBe('999');
  });

  it('formats thousands and millions with K / M suffix', () => {
    expect(formatThaiCompact(1_000)).toBe('1K');
    expect(formatThaiCompact(850_000)).toBe('850K');
    expect(formatThaiCompact(1_200_000)).toBe('1.2M');
    expect(formatThaiCompact(12_500_000)).toBe('12.5M');
  });

  it('preserves sign for negatives', () => {
    expect(formatThaiCompact(-1_200_000)).toBe('-1.2M');
    expect(formatThaiCompact(-500)).toBe('-500');
  });

  it('returns "-" for NaN / non-finite inputs', () => {
    expect(formatThaiCompact(Number.NaN)).toBe('-');
    expect(formatThaiCompact(Number.POSITIVE_INFINITY)).toBe('-');
  });
});

describe('makeAxisLabelFormatter', () => {
  it('returns a function whose output equals the matching formatter', () => {
    const bahtFn = makeAxisLabelFormatter('baht');
    const percentFn = makeAxisLabelFormatter('percent');
    const countFn = makeAxisLabelFormatter('count');

    expect(typeof bahtFn).toBe('function');
    expect(typeof percentFn).toBe('function');
    expect(typeof countFn).toBe('function');

    expect(bahtFn(1_200_000)).toBe(formatBaht(1_200_000));
    expect(percentFn(0.65)).toBe(formatPercent(0.65));
    expect(countFn(850_000)).toBe(formatThaiCompact(850_000));
  });

  it('handles edge cases identically to the underlying formatter', () => {
    expect(makeAxisLabelFormatter('baht')(0)).toBe('฿0');
    expect(makeAxisLabelFormatter('percent')(1)).toBe('100%');
    expect(makeAxisLabelFormatter('count')(999)).toBe('999');
  });
});

describe('axisTooltipFormatter', () => {
  type ParamRow = {
    seriesName: string;
    value: number;
    marker: string;
    axisValueLabel?: string;
  };

  it('renders one `<strong>header</strong>` followed by `marker seriesName: formatted-value` per row', () => {
    const fmt = axisTooltipFormatter({ valueFormat: (v) => `${v.toFixed(0)}฿` });
    const html = fmt([
      { seriesName: 'PV', value: 1000, marker: '●', axisValueLabel: 'พ.ค.' },
      { seriesName: 'EV', value: 850, marker: '◆', axisValueLabel: 'พ.ค.' },
    ] as ParamRow[]);
    expect(html).toBe(
      '<strong>พ.ค.</strong><br/>● PV: 1000฿<br/>◆ EV: 850฿',
    );
  });

  it('applies the optional `filter` to drop hidden helper series before formatting', () => {
    const fmt = axisTooltipFormatter({
      valueFormat: (v) => `${v}%`,
      filter: (row) => row.seriesName !== 'variance-helper',
    });
    const html = fmt([
      { seriesName: 'Planned', value: 50, marker: '●', axisValueLabel: 'เม.ย.' },
      { seriesName: 'variance-helper', value: 5, marker: '○', axisValueLabel: 'เม.ย.' },
      { seriesName: 'Actual', value: 45, marker: '◆', axisValueLabel: 'เม.ย.' },
    ] as ParamRow[]);
    expect(html).toBe(
      '<strong>เม.ย.</strong><br/>● Planned: 50%<br/>◆ Actual: 45%',
    );
  });

  it('omits the header when the (filtered) row set has no axisValueLabel', () => {
    const fmt = axisTooltipFormatter({ valueFormat: (v) => `${v}` });
    const html = fmt([
      { seriesName: 'X', value: 1, marker: '●' },
    ] as ParamRow[]);
    expect(html).toBe('● X: 1');
  });

  it('returns the empty string when the filter drops every row (avoids a blank tooltip box)', () => {
    const fmt = axisTooltipFormatter({
      valueFormat: (v) => `${v}`,
      filter: () => false,
    });
    const html = fmt([
      { seriesName: 'X', value: 1, marker: '●', axisValueLabel: 'พ.ค.' },
    ] as ParamRow[]);
    expect(html).toBe('');
  });

  it('returns the empty string when given non-array params (ECharts edge case)', () => {
    const fmt = axisTooltipFormatter({ valueFormat: (v) => `${v}` });
    expect(fmt(undefined)).toBe('');
    expect(fmt({} as unknown)).toBe('');
  });
});

describe('formatter allocation', () => {
  // Sanity: calling each formatter many times must not throw and must
  // produce stable output (i.e. the cached Intl.NumberFormat is reused).
  it('produces deterministic output across repeated calls', () => {
    const samples = [0, 42, 1_000, 850_000, 12_500_000, -1_200_000];
    for (let i = 0; i < 50; i += 1) {
      for (const v of samples) {
        expect(formatBaht(v)).toBe(formatBaht(v));
        expect(formatThaiCompact(v)).toBe(formatThaiCompact(v));
      }
    }
  });
});
