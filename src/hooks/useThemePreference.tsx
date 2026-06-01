'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import {
  getSystemPreference,
  nextThemeChoice,
  readThemePreference,
  resolveTheme,
  writeThemePreference,
  type ResolvedTheme,
  type ThemeChoice,
} from '@/lib/theme-preference';

/**
 * Sprint 4 (E1) — Shared theme-preference state.
 *
 * One singleton lives at the root of the client tree
 * (`ThemePreferenceProvider` in `providers.tsx`); both `ThemeToggle`
 * and `ThemedConfigProvider` read it through `useThemePreference()`.
 * Without this, the AntD `ConfigProvider` would keep its old algorithm
 * after a toggle click because two independent `useState` instances
 * cannot see each other's localStorage writes in the same tab.
 *
 * Pure helpers (readable/writable storage, system-preference lookup,
 * choice resolution) live in `src/lib/theme-preference.ts` and are
 * locked by `theme-preference.test.ts`.
 */
export interface UseThemePreferenceResult {
  choice: ThemeChoice;
  resolved: ResolvedTheme;
  setChoice: (next: ThemeChoice) => void;
  cycle: () => void;
}

const ThemePreferenceContext = createContext<UseThemePreferenceResult | null>(
  null,
);

export function ThemePreferenceProvider({ children }: { children: ReactNode }) {
  // Defensive SSR initial state — we render in light mode on the server,
  // then sync to the persisted/system value on mount. No hydration
  // mismatch warning today because the swap happens in `useEffect`,
  // not during the initial render pass.
  const [choice, setChoiceState] = useState<ThemeChoice>('system');
  const [systemResolved, setSystemResolved] = useState<ResolvedTheme>('light');

  useEffect(() => {
    setChoiceState(readThemePreference());
    setSystemResolved(getSystemPreference());
  }, []);

  // Live-track OS preference so users on "system" get an instant swap
  // when their OS changes (e.g. macOS Auto Appearance crossing sunset).
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mql = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = (event: MediaQueryListEvent) => {
      setSystemResolved(event.matches ? 'dark' : 'light');
    };
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, []);

  const resolved = resolveTheme({ stored: choice, system: systemResolved });

  // Reflect the resolved theme on the <html> element so global CSS,
  // legacy stylesheets, and Tailwind's `darkMode: 'class'` can target
  // it. `data-theme` covers custom CSS; the `.dark` class drives
  // Tailwind variants.
  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.documentElement.setAttribute('data-theme', resolved);
    document.documentElement.classList.toggle('dark', resolved === 'dark');
  }, [resolved]);

  const setChoice = useCallback((next: ThemeChoice) => {
    writeThemePreference(next);
    setChoiceState(next);
  }, []);

  const cycle = useCallback(() => {
    setChoiceState((prev) => {
      const next = nextThemeChoice(prev);
      writeThemePreference(next);
      return next;
    });
  }, []);

  const value = useMemo(
    () => ({ choice, resolved, setChoice, cycle }),
    [choice, resolved, setChoice, cycle],
  );

  return (
    <ThemePreferenceContext.Provider value={value}>
      {children}
    </ThemePreferenceContext.Provider>
  );
}

/**
 * Read the shared theme preference. MUST be called inside a
 * `<ThemePreferenceProvider>` — throws otherwise so a missing provider
 * is loud, not silently broken.
 */
export function useThemePreference(): UseThemePreferenceResult {
  const ctx = useContext(ThemePreferenceContext);
  if (!ctx) {
    throw new Error(
      'useThemePreference must be used inside <ThemePreferenceProvider> ' +
        '(mounted in src/app/providers.tsx)',
    );
  }
  return ctx;
}
