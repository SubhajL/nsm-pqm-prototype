import { describe, expect, it } from 'vitest';

import { caseInsensitiveIncludes } from './search-utils';

describe('caseInsensitiveIncludes', () => {
  it('returns true when needle is empty (matches everything)', () => {
    expect(caseInsensitiveIncludes('any haystack', '')).toBe(true);
    expect(caseInsensitiveIncludes('', '')).toBe(true);
  });

  it('matches across letter cases (Latin)', () => {
    expect(caseInsensitiveIncludes('Hello World', 'hello')).toBe(true);
    expect(caseInsensitiveIncludes('Hello World', 'WORLD')).toBe(true);
    expect(caseInsensitiveIncludes('Hello World', 'world')).toBe(true);
  });

  it('matches Thai substrings without case-folding (Thai has no case)', () => {
    expect(caseInsensitiveIncludes('โครงการก่อสร้างฝาย', 'ฝาย')).toBe(true);
    expect(caseInsensitiveIncludes('โครงการ', 'นิทรรศการ')).toBe(false);
  });

  it('returns false when needle is not in haystack', () => {
    expect(caseInsensitiveIncludes('alpha', 'beta')).toBe(false);
  });

  it('treats leading/trailing whitespace on the NEEDLE as part of the match', () => {
    // We do NOT trim — call sites should trim if that's what they want.
    expect(caseInsensitiveIncludes('one two', ' two')).toBe(true);
    expect(caseInsensitiveIncludes('one two', 'one ')).toBe(true);
  });

  it('does not mutate inputs', () => {
    const haystack = 'KEEP CASE';
    const needle = 'CASE';
    caseInsensitiveIncludes(haystack, needle);
    expect(haystack).toBe('KEEP CASE');
    expect(needle).toBe('CASE');
  });
});
