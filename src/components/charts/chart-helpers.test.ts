import { describe, expect, it } from 'vitest';

import { baselineLegend, todayMarkLine } from './chart-helpers';

/**
 * PR-A4 — chart helpers.
 *
 * These two small builders centralise the "today" marker and bilingual
 * series-name legend shapes that recur across the S-curve, EVM trend,
 * and Gantt-overlay charts. Pure functions: they return ECharts option
 * fragments that the caller slots into `series[N].markLine` or
 * `legend.data`.
 */

describe('todayMarkLine', () => {
  it('defaults the label to bilingual "วันนี้ (Today)"', () => {
    const fragment = todayMarkLine() as {
      symbol?: string;
      label?: { formatter?: string };
      data?: Array<{ xAxis?: string }>;
    };
    expect(fragment.label?.formatter).toBe('วันนี้ (Today)');
  });

  it('accepts a custom bilingual label', () => {
    const fragment = todayMarkLine({ label: 'รอบล่าสุด (Latest)' }) as {
      label?: { formatter?: string };
    };
    expect(fragment.label?.formatter).toBe('รอบล่าสุด (Latest)');
  });

  it('returns a markLine fragment with a vertical guide and no end symbol', () => {
    const fragment = todayMarkLine() as {
      symbol?: string;
      data?: Array<{ xAxis?: string }>;
    };
    expect(fragment.symbol).toBe('none');
    expect(Array.isArray(fragment.data)).toBe(true);
    expect(fragment.data?.[0]?.xAxis).toBe('today');
  });
});

describe('baselineLegend', () => {
  it('returns one entry per input pair in the bilingual format', () => {
    const legend = baselineLegend([
      { thai: 'แผนงาน', english: 'Plan' },
      { thai: 'มูลค่าที่ได้', english: 'Earned' },
      { thai: 'ค่าใช้จ่ายจริง', english: 'Actual' },
    ]);
    expect(legend).toEqual([
      { name: 'แผนงาน (Plan)' },
      { name: 'มูลค่าที่ได้ (Earned)' },
      { name: 'ค่าใช้จ่ายจริง (Actual)' },
    ]);
  });

  it('returns [] for an empty input array', () => {
    expect(baselineLegend([])).toEqual([]);
  });

  it('does not mutate the input', () => {
    const input = [{ thai: 'งบประมาณ', english: 'Budget' }];
    const before = JSON.stringify(input);
    baselineLegend(input);
    expect(JSON.stringify(input)).toBe(before);
  });
});
