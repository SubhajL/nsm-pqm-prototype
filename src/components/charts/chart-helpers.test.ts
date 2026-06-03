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

  it('omits explicit color when not provided so the chart inherits the series color', () => {
    const fragment = todayMarkLine() as {
      label?: { color?: string };
      lineStyle?: { color?: string };
    };
    expect(fragment.label?.color).toBeUndefined();
    expect(fragment.lineStyle?.color).toBeUndefined();
  });

  it('applies the `color` option uniformly to both the line and the label', () => {
    const fragment = todayMarkLine({ color: '#E74C3C' }) as {
      label?: { color?: string };
      lineStyle?: { color?: string };
    };
    expect(fragment.label?.color).toBe('#E74C3C');
    expect(fragment.lineStyle?.color).toBe('#E74C3C');
  });

  it('omits fontWeight when not provided (ECharts default = normal)', () => {
    const fragment = todayMarkLine() as {
      label?: { fontWeight?: string | number };
    };
    expect(fragment.label?.fontWeight).toBeUndefined();
  });

  it('applies the `labelFontWeight` option to the label only', () => {
    const fragment = todayMarkLine({ labelFontWeight: 'bold' }) as {
      label?: { fontWeight?: string | number };
      lineStyle?: { fontWeight?: string | number };
    };
    expect(fragment.label?.fontWeight).toBe('bold');
    // Sanity: fontWeight is a label-only concern; the lineStyle should not pick it up.
    expect(fragment.lineStyle?.fontWeight).toBeUndefined();
  });

  it('honours all three options together (label + color + labelFontWeight)', () => {
    const fragment = todayMarkLine({
      label: 'ข้อมูลงวดล่าสุด (Latest)',
      color: '#E74C3C',
      labelFontWeight: 'bold',
    }) as {
      label?: { formatter?: string; color?: string; fontWeight?: string | number };
      lineStyle?: { color?: string };
    };
    expect(fragment.label?.formatter).toBe('ข้อมูลงวดล่าสุด (Latest)');
    expect(fragment.label?.color).toBe('#E74C3C');
    expect(fragment.label?.fontWeight).toBe('bold');
    expect(fragment.lineStyle?.color).toBe('#E74C3C');
  });

  it('defaults the line width to 2 (used by the S-curve "Latest" marker)', () => {
    const fragment = todayMarkLine() as {
      lineStyle?: { width?: number };
    };
    expect(fragment.lineStyle?.width).toBe(2);
  });

  it('applies a custom `lineWidth` to the lineStyle', () => {
    const fragment = todayMarkLine({ lineWidth: 1 }) as {
      lineStyle?: { width?: number };
    };
    expect(fragment.lineStyle?.width).toBe(1);
  });

  it('preserves dashed line type when `lineWidth` is overridden', () => {
    const fragment = todayMarkLine({ lineWidth: 1 }) as {
      lineStyle?: { type?: string; width?: number };
    };
    expect(fragment.lineStyle?.type).toBe('dashed');
    expect(fragment.lineStyle?.width).toBe(1);
  });

  it('composes `lineWidth` with `color` so the consumer inherits dash + color and only overrides width', () => {
    const fragment = todayMarkLine({ color: '#595959', lineWidth: 1 }) as {
      lineStyle?: { type?: string; color?: string; width?: number };
      label?: { color?: string };
    };
    expect(fragment.lineStyle?.type).toBe('dashed');
    expect(fragment.lineStyle?.color).toBe('#595959');
    expect(fragment.lineStyle?.width).toBe(1);
    expect(fragment.label?.color).toBe('#595959');
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
