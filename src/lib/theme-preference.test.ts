import { describe, expect, it } from 'vitest';

import {
  getSystemPreference,
  nextThemeChoice,
  readThemePreference,
  resolveTheme,
  THEME_PREF_KEY,
  writeThemePreference,
} from './theme-preference';

function fakeStorage(initial: Record<string, string> = {}) {
  const data = { ...initial };
  return {
    getItem(key: string): string | null {
      return data[key] ?? null;
    },
    setItem(key: string, value: string): void {
      data[key] = value;
    },
    snapshot(): Record<string, string> {
      return { ...data };
    },
  };
}

describe('readThemePreference', () => {
  it('returns "system" when nothing stored', () => {
    expect(readThemePreference(fakeStorage())).toBe('system');
  });

  it('returns the stored value when it is a valid choice', () => {
    expect(readThemePreference(fakeStorage({ [THEME_PREF_KEY]: 'dark' }))).toBe('dark');
    expect(readThemePreference(fakeStorage({ [THEME_PREF_KEY]: 'light' }))).toBe('light');
    expect(readThemePreference(fakeStorage({ [THEME_PREF_KEY]: 'system' }))).toBe('system');
  });

  it('falls back to "system" on hand-edited / stale values', () => {
    expect(readThemePreference(fakeStorage({ [THEME_PREF_KEY]: 'XL' }))).toBe('system');
    expect(readThemePreference(fakeStorage({ [THEME_PREF_KEY]: '' }))).toBe('system');
  });

  it('returns "system" when storage is null (SSR safe)', () => {
    expect(readThemePreference(null)).toBe('system');
  });
});

describe('writeThemePreference', () => {
  it('persists a valid choice to storage', () => {
    const s = fakeStorage();
    writeThemePreference('dark', s);
    expect(s.snapshot()[THEME_PREF_KEY]).toBe('dark');
  });

  it('is a no-op when storage is null', () => {
    expect(() => writeThemePreference('dark', null)).not.toThrow();
  });
});

describe('getSystemPreference', () => {
  it('returns "dark" when prefers-color-scheme: dark matches', () => {
    expect(getSystemPreference(() => ({ matches: true }))).toBe('dark');
  });

  it('returns "light" when the media query does NOT match', () => {
    expect(getSystemPreference(() => ({ matches: false }))).toBe('light');
  });

  it('falls back to "light" when matchMedia is null (SSR)', () => {
    expect(getSystemPreference(null)).toBe('light');
  });
});

describe('resolveTheme', () => {
  it('returns the stored value when the user chose explicitly', () => {
    expect(resolveTheme({ stored: 'light', system: 'dark' })).toBe('light');
    expect(resolveTheme({ stored: 'dark', system: 'light' })).toBe('dark');
  });

  it('returns the system value when stored="system"', () => {
    expect(resolveTheme({ stored: 'system', system: 'dark' })).toBe('dark');
    expect(resolveTheme({ stored: 'system', system: 'light' })).toBe('light');
  });
});

describe('nextThemeChoice', () => {
  it('cycles light → dark → system → light', () => {
    expect(nextThemeChoice('light')).toBe('dark');
    expect(nextThemeChoice('dark')).toBe('system');
    expect(nextThemeChoice('system')).toBe('light');
  });
});
