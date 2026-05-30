/**
 * PR-A3 — pure helpers backing `FilterBar`. Kept JSX-free so the
 * "is any filter active?" / reset reducer can be unit-tested under
 * vitest's node environment.
 */

export type FilterValue = string | string[] | boolean | number | null | undefined;
export type FilterState = Record<string, FilterValue>;

/**
 * Returns true when at least one entry is a "meaningful" value:
 *   - non-empty string
 *   - non-empty array
 *   - boolean `true` (toggle filters)
 *   - number that is not zero / NaN
 *
 * `null`, `undefined`, `''`, `[]`, and `false` are all treated as
 * "no filter active" — this matches how AntD Select / Tag chips clear.
 */
export function hasAnyActiveFilter(state: FilterState): boolean {
  for (const value of Object.values(state)) {
    if (value === null || value === undefined) continue;
    if (typeof value === 'boolean') {
      if (value) return true;
      continue;
    }
    if (typeof value === 'string') {
      if (value.length > 0) return true;
      continue;
    }
    if (typeof value === 'number') {
      if (value !== 0 && !Number.isNaN(value)) return true;
      continue;
    }
    if (Array.isArray(value)) {
      if (value.length > 0) return true;
      continue;
    }
  }
  return false;
}

/**
 * Returns a fresh state object where every key is reset to `null`.
 * Used as the canonical reducer for the FilterBar's "Reset" affordance.
 */
export function resetFilters<T extends FilterState>(state: T): Record<keyof T, null> {
  const out = {} as Record<keyof T, null>;
  for (const key of Object.keys(state) as Array<keyof T>) {
    out[key] = null;
  }
  return out;
}
