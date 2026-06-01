import { describe, expect, it } from 'vitest';

import { formatBahtLive, parseBahtLive } from './baht-live-format';

describe('formatBahtLive', () => {
  it('formats integers with Thai grouping + leading ฿', () => {
    expect(formatBahtLive(1234)).toBe('฿1,234');
    expect(formatBahtLive(1234567)).toBe('฿1,234,567');
  });

  it('preserves up to 2 decimal places', () => {
    expect(formatBahtLive(1234.5)).toBe('฿1,234.5');
    expect(formatBahtLive(1234.56)).toBe('฿1,234.56');
  });

  it('returns empty string for undefined / null / empty', () => {
    expect(formatBahtLive(undefined)).toBe('');
    expect(formatBahtLive('')).toBe('');
  });

  it('returns empty string for non-numeric input', () => {
    expect(formatBahtLive('not-a-number')).toBe('');
  });

  it('accepts numeric strings', () => {
    expect(formatBahtLive('500')).toBe('฿500');
  });

  it('handles zero (renders ฿0, not empty)', () => {
    expect(formatBahtLive(0)).toBe('฿0');
  });
});

describe('parseBahtLive', () => {
  it('strips leading ฿ symbol', () => {
    expect(parseBahtLive('฿1,234')).toBe('1234');
  });

  it('strips commas (Thai grouping)', () => {
    expect(parseBahtLive('1,234,567')).toBe('1234567');
  });

  it('preserves decimal point + minus sign', () => {
    expect(parseBahtLive('-฿1,234.56')).toBe('-1234.56');
  });

  it('returns empty string for undefined / empty', () => {
    expect(parseBahtLive(undefined)).toBe('');
    expect(parseBahtLive('')).toBe('');
  });

  it('round-trips with formatter', () => {
    const formatted = formatBahtLive(987_654.32);
    expect(formatted).toBe('฿987,654.32');
    expect(parseBahtLive(formatted)).toBe('987654.32');
  });
});
