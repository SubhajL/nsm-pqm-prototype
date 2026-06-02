import { describe, expect, it } from 'vitest';

import { COLORS } from '@/theme/antd-theme';
import { getContrastRatio } from '@/theme/contrast';

import { resolveStatisticValueColor } from './kpi-card-color';

describe('resolveStatisticValueColor', () => {
  it('maps brand `warning` → AA-safe `warningText` on white', () => {
    expect(resolveStatisticValueColor(COLORS.warning)).toBe(COLORS.warningText);
  });

  it('maps brand `error` → AA-safe `errorText` on white', () => {
    expect(resolveStatisticValueColor(COLORS.error)).toBe(COLORS.errorText);
  });

  it('maps brand `success` → AA-safe `successText` on white', () => {
    expect(resolveStatisticValueColor(COLORS.success)).toBe(COLORS.successText);
  });

  it('maps brand `accentTeal` → AA-safe `accentTealText` on white', () => {
    expect(resolveStatisticValueColor(COLORS.accentTeal)).toBe(COLORS.accentTealText);
  });

  it('passes `info` through unchanged (already AA-compliant after PR-A1 darkening)', () => {
    expect(resolveStatisticValueColor(COLORS.info)).toBe(COLORS.info);
  });

  it('passes `primary` through unchanged (dark navy, exceeds AA on white)', () => {
    expect(resolveStatisticValueColor(COLORS.primary)).toBe(COLORS.primary);
  });

  it('passes arbitrary non-status colors through unchanged', () => {
    expect(resolveStatisticValueColor('#123456')).toBe('#123456');
  });

  it('every resolved color satisfies WCAG-AA (≥ 4.5:1) on white', () => {
    const inputs = [
      COLORS.warning,
      COLORS.error,
      COLORS.success,
      COLORS.accentTeal,
      COLORS.info,
      COLORS.primary,
    ];
    for (const input of inputs) {
      const resolved = resolveStatisticValueColor(input);
      const ratio = getContrastRatio(resolved, COLORS.white);
      expect(
        ratio,
        `${input} resolved to ${resolved}: got ${ratio.toFixed(2)} on white`,
      ).toBeGreaterThanOrEqual(4.5);
    }
  });
});
