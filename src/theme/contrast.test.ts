import { describe, expect, it } from 'vitest';

import {
  auditPaletteContrast,
  getContrastRatio,
  getRelativeLuminance,
  meetsWcagAA,
} from './contrast';

describe('getRelativeLuminance', () => {
  it('returns 0 for black and 1 for white (WCAG 2.x anchors)', () => {
    expect(getRelativeLuminance('#000000')).toBeCloseTo(0, 6);
    expect(getRelativeLuminance('#ffffff')).toBeCloseTo(1, 6);
  });

  it('accepts 3-digit and 6-digit hex with or without the leading hash', () => {
    expect(getRelativeLuminance('fff')).toBeCloseTo(1, 6);
    expect(getRelativeLuminance('#FFF')).toBeCloseTo(1, 6);
    expect(getRelativeLuminance('FFFFFF')).toBeCloseTo(1, 6);
  });

  it('throws on an invalid hex string', () => {
    expect(() => getRelativeLuminance('not-a-color')).toThrow();
    expect(() => getRelativeLuminance('#ggg')).toThrow();
  });
});

describe('getContrastRatio', () => {
  it('returns 21 for white on black (the WCAG ceiling)', () => {
    expect(getContrastRatio('#ffffff', '#000000')).toBeCloseTo(21, 1);
  });

  it('returns 1 for identical colors', () => {
    expect(getContrastRatio('#1E3A5F', '#1E3A5F')).toBeCloseTo(1, 4);
  });

  it('is symmetric (order of the two colors does not matter)', () => {
    const ab = getContrastRatio('#1E3A5F', '#ffffff');
    const ba = getContrastRatio('#ffffff', '#1E3A5F');
    expect(ab).toBeCloseTo(ba, 6);
  });

  it('matches a known WCAG worked example (#777 on #fff ≈ 4.48)', () => {
    expect(getContrastRatio('#777777', '#ffffff')).toBeCloseTo(4.48, 1);
  });
});

describe('meetsWcagAA', () => {
  it('treats ≥ 4.5 as a pass for normal text', () => {
    expect(meetsWcagAA('#595959', '#ffffff')).toBe(true); // ≈ 7.0 — clearly AA
    expect(meetsWcagAA('#8c8c8c', '#ffffff')).toBe(false); // ≈ 3.5 — fails AA normal
  });

  it('relaxes the threshold to 3.0 when isLargeText is true', () => {
    // #8C8C8C on white ≈ 3.5 — fails normal but passes large.
    expect(meetsWcagAA('#8c8c8c', '#ffffff', { isLargeText: true })).toBe(true);
    expect(meetsWcagAA('#8c8c8c', '#ffffff')).toBe(false);
  });

  it('relaxes the threshold to 3.0 for non-text UI elements', () => {
    // The project primary (#1E3A5F) on white sits well above any threshold;
    // we use it as the positive anchor for the non-text relaxation.
    expect(meetsWcagAA('#1E3A5F', '#ffffff', { isNonText: true })).toBe(true);
    // Sanity-check the relaxation actually changes the answer: a color
    // that fails normal-text AA but passes non-text.
    const fg = '#777777'; // ≈ 4.48 — fails normal (<4.5), passes non-text (>3)
    expect(meetsWcagAA(fg, '#ffffff')).toBe(false);
    expect(meetsWcagAA(fg, '#ffffff', { isNonText: true })).toBe(true);
  });
});

describe('auditPaletteContrast', () => {
  it('reports per-token pass/fail against the supplied background', () => {
    const palette = {
      strong: '#1E3A5F', // very high contrast — passes
      weak: '#8c8c8c', // mid grey — fails AA normal on white
    };
    const result = auditPaletteContrast(palette, '#ffffff');

    expect(result.strong.passes).toBe(true);
    expect(result.weak.passes).toBe(false);
    expect(result.weak.ratio).toBeLessThan(4.5);
  });

  it('honours the per-token isLargeText / isNonText overrides', () => {
    const palette = {
      muted: { fg: '#8c8c8c', isLargeText: true },
    };
    const result = auditPaletteContrast(palette, '#ffffff');
    expect(result.muted.passes).toBe(true);
  });
});
