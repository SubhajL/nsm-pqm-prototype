import { describe, expect, it } from 'vitest';

import {
  SPACING,
  SPACING_TOKENS,
  THAI_BODY_SIZE_FLOOR_PX,
  TYPE_SCALE,
  TYPE_SCALE_TOKENS,
  pxFromRem,
  withThaiMinSize,
} from './scales';

describe('TYPE_SCALE', () => {
  it('lists tokens from smallest to largest', () => {
    const sizesPx = TYPE_SCALE_TOKENS.map((t) => pxFromRem(TYPE_SCALE[t].size));
    for (let i = 1; i < sizesPx.length; i += 1) {
      expect(sizesPx[i]).toBeGreaterThan(sizesPx[i - 1]);
    }
  });

  it('exposes both font-size and line-height per token', () => {
    for (const token of TYPE_SCALE_TOKENS) {
      const entry = TYPE_SCALE[token];
      expect(entry.size).toMatch(/rem$/);
      expect(entry.lineHeight).toMatch(/rem$/);
    }
  });

  it('uses `base` (14px) as the canonical body token matching AntD default', () => {
    expect(pxFromRem(TYPE_SCALE.base.size)).toBe(14);
  });

  it('each token has line-height ≥ its size (no descender clipping)', () => {
    for (const token of TYPE_SCALE_TOKENS) {
      const size = pxFromRem(TYPE_SCALE[token].size);
      const lineHeight = pxFromRem(TYPE_SCALE[token].lineHeight);
      expect(lineHeight).toBeGreaterThanOrEqual(size);
    }
  });
});

describe('SPACING', () => {
  it('lists tokens from smallest to largest', () => {
    const values = SPACING_TOKENS.map((t) => SPACING[t]);
    for (let i = 1; i < values.length; i += 1) {
      expect(values[i]).toBeGreaterThan(values[i - 1]);
    }
  });

  it('uses a 4px base grid (every value is a multiple of 4)', () => {
    for (const token of SPACING_TOKENS) {
      expect(SPACING[token] % 4).toBe(0);
    }
  });

  it('aligns `2xl` (24px) with the AntD default gutter', () => {
    expect(SPACING['2xl']).toBe(24);
  });
});

describe('THAI_BODY_SIZE_FLOOR_PX', () => {
  it('is at least 14px (Punsongserm & Suvakunta 2024 baseline mapped to web)', () => {
    expect(THAI_BODY_SIZE_FLOOR_PX).toBeGreaterThanOrEqual(14);
  });
});

describe('withThaiMinSize', () => {
  it('clamps a value smaller than the floor up to the floor', () => {
    expect(withThaiMinSize(11)).toBe(THAI_BODY_SIZE_FLOOR_PX);
    expect(withThaiMinSize(12)).toBe(THAI_BODY_SIZE_FLOOR_PX);
  });

  it('passes through a value at or above the floor unchanged', () => {
    expect(withThaiMinSize(THAI_BODY_SIZE_FLOOR_PX)).toBe(THAI_BODY_SIZE_FLOOR_PX);
    expect(withThaiMinSize(16)).toBe(16);
    expect(withThaiMinSize(32)).toBe(32);
  });
});

describe('pxFromRem', () => {
  it('treats 1rem as 16px (browser default root size)', () => {
    expect(pxFromRem('1rem')).toBe(16);
    expect(pxFromRem('0.875rem')).toBe(14);
    expect(pxFromRem('1.25rem')).toBe(20);
  });
});
