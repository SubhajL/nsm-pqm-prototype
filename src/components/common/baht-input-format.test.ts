import { describe, expect, it } from 'vitest';

import { formatBahtInputValue, parseBahtInputValue } from './baht-input-format';

describe('formatBahtInputValue', () => {
  it('groups thousands with commas', () => {
    expect(formatBahtInputValue(1234567)).toBe('1,234,567');
    expect(formatBahtInputValue(999)).toBe('999');
  });

  it('keeps the sign on negative amounts (amendment deltas)', () => {
    expect(formatBahtInputValue(-1234567)).toBe('-1,234,567');
  });

  it('groups only the integer part of decimals', () => {
    expect(formatBahtInputValue(1234567.89)).toBe('1,234,567.89');
  });

  it('renders empty string for null / undefined / empty (cleared field)', () => {
    expect(formatBahtInputValue(null)).toBe('');
    expect(formatBahtInputValue(undefined)).toBe('');
    expect(formatBahtInputValue('')).toBe('');
  });
});

describe('parseBahtInputValue', () => {
  it('strips commas and whitespace', () => {
    expect(parseBahtInputValue('1,234,567')).toBe(1234567);
    expect(parseBahtInputValue(' 1,234 ')).toBe(1234);
  });

  it('parses negative amounts', () => {
    expect(parseBahtInputValue('-1,234')).toBe(-1234);
  });

  it('returns null (NOT 0) for cleared input', () => {
    expect(parseBahtInputValue('')).toBeNull();
    expect(parseBahtInputValue('   ')).toBeNull();
    expect(parseBahtInputValue(undefined)).toBeNull();
  });

  it('returns null for a lone minus sign (mid-typing)', () => {
    expect(parseBahtInputValue('-')).toBeNull();
  });

  it('returns null instead of NaN for garbage input', () => {
    expect(parseBahtInputValue('12a')).toBeNull();
    expect(parseBahtInputValue('abc')).toBeNull();
  });

  it('round-trips with the formatter', () => {
    expect(parseBahtInputValue(formatBahtInputValue(9876543))).toBe(9876543);
    expect(parseBahtInputValue(formatBahtInputValue(-2500000))).toBe(-2500000);
  });
});
