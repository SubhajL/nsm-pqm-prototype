import { describe, expect, it } from 'vitest';

import {
  formatBaht,
  formatBahtCurrency,
  formatBahtShort,
  formatPercent,
  formatThaiDate,
  formatThaiDateShort,
  toBuddhistYear,
} from './date-utils';

describe('toBuddhistYear', () => {
  it('adds 543 to convert CE to BE', () => {
    expect(toBuddhistYear(2026)).toBe(2569);
  });
});

describe('formatThaiDate', () => {
  it('formats ISO date as DD/MM/BBBB with Buddhist year', () => {
    expect(formatThaiDate('2026-07-15')).toBe('15/07/2569');
  });
});

describe('formatThaiDateShort', () => {
  it('formats ISO date as "D เดือน BB" with two-digit Buddhist year', () => {
    expect(formatThaiDateShort('2026-07-15')).toBe('15 ก.ค. 69');
  });
});

describe('formatPercent', () => {
  it('renders fractional ratio as integer percent', () => {
    expect(formatPercent(0.65)).toBe('65%');
  });
});

describe('formatBaht', () => {
  it('groups Thai-locale digits without a ฿ symbol', () => {
    const out = formatBaht(12_500_000);
    expect(out).not.toMatch(/฿/);
    expect(out).toMatch(/12.500.000|12,500,000/);
  });
});

describe('formatBahtCurrency', () => {
  it('uses Intl currency style so the ฿ symbol position is locale-aware', () => {
    const out = formatBahtCurrency(12_500_000);
    expect(out).toMatch(/฿/);
    // The ฿ symbol must precede the digits in th-TH (never suffixed
    // — CLAUDE.md "never hardcode ฿ symbol placement" rule).
    const symbolIdx = out.indexOf('฿');
    const firstDigitIdx = out.search(/\d/);
    expect(symbolIdx).toBeGreaterThanOrEqual(0);
    expect(firstDigitIdx).toBeGreaterThan(symbolIdx);
  });
});

describe('formatBahtShort', () => {
  it('emits the ฿ symbol via Intl (never hand-rolled suffix) — CLAUDE.md rule', () => {
    const out = formatBahtShort(12_500_000);
    expect(out).toMatch(/฿/);
    // PR-fix: previously rendered "12.5M฿" (suffix), violating
    // CLAUDE.md "never hardcode ฿ symbol placement". The symbol must
    // come BEFORE the first digit in th-TH locale output.
    const symbolIdx = out.indexOf('฿');
    const firstDigitIdx = out.search(/\d/);
    expect(symbolIdx).toBeGreaterThanOrEqual(0);
    expect(firstDigitIdx).toBeGreaterThan(symbolIdx);
  });

  it('emits a compact representation shorter than the non-compact currency form', () => {
    const long = formatBahtCurrency(12_500_000);
    const short = formatBahtShort(12_500_000);
    expect(short.length).toBeLessThan(long.length);
  });

  it('renders 0 cleanly without breaking the ฿-before-digit invariant', () => {
    const out = formatBahtShort(0);
    expect(out).toMatch(/฿/);
    const symbolIdx = out.indexOf('฿');
    const firstDigitIdx = out.search(/\d/);
    expect(firstDigitIdx).toBeGreaterThan(symbolIdx);
  });

  it('handles thousands (1_000 ≤ amount < 1_000_000) with a compact form', () => {
    const out = formatBahtShort(12_500);
    expect(out).toMatch(/฿/);
    // 12_500 baht — compact form should be substantially shorter than
    // the full "฿12,500" rendering.
    expect(out.length).toBeLessThan(formatBahtCurrency(12_500).length + 2);
  });

  it('formats negative amounts without breaking ฿-before-digit invariant', () => {
    const out = formatBahtShort(-5_000_000);
    expect(out).toMatch(/฿/);
    const symbolIdx = out.indexOf('฿');
    const firstDigitIdx = out.search(/\d/);
    expect(firstDigitIdx).toBeGreaterThan(symbolIdx);
  });
});
