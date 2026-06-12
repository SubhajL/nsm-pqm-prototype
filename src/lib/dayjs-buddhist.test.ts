import dayjs from 'dayjs';
import { describe, expect, it } from 'vitest';

import '@/lib/dayjs-buddhist';

describe('dayjs buddhist-era setup (PR-32)', () => {
  it('formats CE dates with BBBB as Buddhist Era', () => {
    expect(dayjs('2026-07-15').format('DD/MM/BBBB')).toBe('15/07/2569');
    expect(dayjs('2026-01-01').format('BBBB')).toBe('2569');
  });

  it('parses BE-typed input back to the CE date (the buddhistEra plugin alone cannot)', () => {
    const parsed = dayjs('15/07/2569', 'DD/MM/BBBB');
    expect(parsed.isValid()).toBe(true);
    expect(parsed.format('YYYY-MM-DD')).toBe('2026-07-15');
  });

  it('round-trips display → parse → display', () => {
    const display = dayjs('2026-12-31').format('DD/MM/BBBB');
    expect(display).toBe('31/12/2569');
    expect(dayjs(display, 'DD/MM/BBBB').format('YYYY-MM-DD')).toBe('2026-12-31');
  });

  it('parses BE input in strict mode (AntD pickers parse strictly)', () => {
    expect(dayjs('15/07/2569', 'DD/MM/BBBB', true).isValid()).toBe(true);
    expect(dayjs('15/07/2569', 'DD/MM/BBBB', true).year()).toBe(2026);
    expect(dayjs('garbage', 'DD/MM/BBBB', true).isValid()).toBe(false);
  });

  it('supports the month-picker format MM/BBBB', () => {
    expect(dayjs('2026-08-01').format('MM/BBBB')).toBe('08/2569');
    const parsed = dayjs('08/2569', 'MM/BBBB');
    expect(parsed.isValid()).toBe(true);
    expect(parsed.year()).toBe(2026);
    expect(parsed.month()).toBe(7);
  });

  it('supports a format-array as AntD passes for multi-format parsing', () => {
    const parsed = dayjs('15/07/2569', ['DD/MM/BBBB']);
    expect(parsed.format('YYYY-MM-DD')).toBe('2026-07-15');
  });

  it('does NOT shift CE input matched by a CE entry in a mixed array', () => {
    const ce = dayjs('2026-07-15', ['YYYY-MM-DD', 'DD/MM/BBBB']);
    expect(ce.format('YYYY-MM-DD')).toBe('2026-07-15');

    const be = dayjs('15/07/2569', ['YYYY-MM-DD', 'DD/MM/BBBB']);
    expect(be.format('YYYY-MM-DD')).toBe('2026-07-15');
  });

  it('handles the leap-day edge across the 543-year shift', () => {
    // 2024-02-29 is a leap day; BE 2567. 2567 CE is NOT a leap year, so the
    // intermediate parse must not normalize the day away.
    const parsed = dayjs('29/02/2567', 'DD/MM/BBBB');
    expect(parsed.isValid()).toBe(true);
    expect(parsed.format('YYYY-MM-DD')).toBe('2024-02-29');
  });

  it('leaves non-BBBB format parsing untouched (CE in, CE out)', () => {
    expect(dayjs('2026-07-15', 'YYYY-MM-DD').year()).toBe(2026);
    expect(dayjs('15/07/2026', 'DD/MM/YYYY').year()).toBe(2026);
  });

  it('leaves plain ISO parsing (API payloads) untouched', () => {
    expect(dayjs('2026-07-15').year()).toBe(2026);
  });
});
