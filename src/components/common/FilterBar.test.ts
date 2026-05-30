import { describe, expect, it } from 'vitest';

import {
  hasAnyActiveFilter,
  type FilterState,
  resetFilters,
} from './filter-utils';

describe('hasAnyActiveFilter', () => {
  it('returns false when every entry is null/undefined/empty-string/empty-array', () => {
    const state: FilterState = {
      a: null,
      b: undefined,
      c: '',
      d: [],
    };
    expect(hasAnyActiveFilter(state)).toBe(false);
  });

  it('returns true when at least one entry is a non-empty string', () => {
    expect(hasAnyActiveFilter({ q: 'hello' })).toBe(true);
  });

  it('returns true when at least one entry is a non-empty array', () => {
    expect(hasAnyActiveFilter({ tags: ['urgent'] })).toBe(true);
  });

  it('does not consider boolean `false` as "active" (avoids false-positives on toggles)', () => {
    expect(hasAnyActiveFilter({ archived: false })).toBe(false);
  });

  it('treats `true` as active', () => {
    expect(hasAnyActiveFilter({ archived: true })).toBe(true);
  });
});

describe('resetFilters', () => {
  it('replaces every value with null (preserves keys)', () => {
    const state: FilterState = { q: 'x', tags: ['a'], archived: true };
    const reset = resetFilters(state);
    expect(reset).toEqual({ q: null, tags: null, archived: null });
    expect(Object.keys(reset)).toEqual(['q', 'tags', 'archived']);
  });

  it('does not mutate the original state', () => {
    const state: FilterState = { q: 'x' };
    const reset = resetFilters(state);
    expect(state).toEqual({ q: 'x' });
    expect(reset).not.toBe(state);
  });
});
