/**
 * Sprint 4 (E1) — Pure helpers for the theme-preference flow.
 *
 * Kept in a `.ts` file (no JSX, no React) so they unit-test under the
 * project's node-env vitest config without jsdom. The React hook that
 * uses these helpers lives in `src/hooks/useThemePreference.ts`.
 *
 * Storage shape: a single localStorage key (`THEME_PREF_KEY`) holding
 * one of `'light' | 'dark' | 'system'`. Any other value is treated as
 * `'system'` so a hand-edited or stale entry never crashes the app.
 */

export type ThemeChoice = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

export const THEME_PREF_KEY = 'nsm-pqm:theme';
const VALID_CHOICES = new Set<ThemeChoice>(['light', 'dark', 'system']);

/**
 * Reads the user's stored preference. Returns `'system'` when no value
 * is stored OR the stored value is unrecognised. Designed to be safe
 * to call during SSR (`typeof window === 'undefined'` short-circuits).
 */
export function readThemePreference(
  storage: Pick<Storage, 'getItem'> | null = typeof window === 'undefined'
    ? null
    : window.localStorage,
): ThemeChoice {
  if (!storage) return 'system';
  const raw = storage.getItem(THEME_PREF_KEY);
  if (raw === null) return 'system';
  return VALID_CHOICES.has(raw as ThemeChoice) ? (raw as ThemeChoice) : 'system';
}

/**
 * Writes the user's preference. The implementation is intentionally a
 * one-liner so call sites and tests can swap a fake storage cleanly.
 */
export function writeThemePreference(
  next: ThemeChoice,
  storage: Pick<Storage, 'setItem'> | null = typeof window === 'undefined'
    ? null
    : window.localStorage,
): void {
  if (!storage) return;
  storage.setItem(THEME_PREF_KEY, next);
}

/**
 * Returns the current OS-level color-scheme preference. `'light'` is the
 * defensive fallback when `matchMedia` is unavailable (SSR, headless
 * test envs without jsdom, ancient browsers).
 */
export function getSystemPreference(
  matchMedia: ((query: string) => { matches: boolean }) | null =
    typeof window === 'undefined' ? null : window.matchMedia.bind(window),
): ResolvedTheme {
  if (!matchMedia) return 'light';
  return matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

/**
 * Reduces `{ stored, system }` to the actual theme that should render.
 * When the stored choice is `'system'` (or unrecognised), the OS
 * preference wins.
 */
export function resolveTheme(args: {
  stored: ThemeChoice;
  system: ResolvedTheme;
}): ResolvedTheme {
  return args.stored === 'system' ? args.system : args.stored;
}

/**
 * Cycle helper: `light → dark → system → light`. The toggle button uses
 * this so a single click moves through the three states deterministically.
 */
export function nextThemeChoice(current: ThemeChoice): ThemeChoice {
  switch (current) {
    case 'light':
      return 'dark';
    case 'dark':
      return 'system';
    case 'system':
    default:
      return 'light';
  }
}
