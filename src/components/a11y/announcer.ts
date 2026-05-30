/**
 * Screen-reader announcer (WCAG SC 4.1.3 / 1.3.1).
 *
 * Maintains at most one `polite` and one `assertive` live region for the
 * whole app. `LiveRegion.tsx` registers itself on mount and unregisters
 * on unmount; any code path that needs to announce async UI state
 * (toasts, validation summaries, route-change confirmations) calls
 * {@link announce} — no React import required at the call site.
 *
 * The module is intentionally framework-agnostic (no React imports) so
 * it can be unit-tested in a node environment without JSDOM.
 *
 * Politeness rules (WCAG / ARIA Authoring Practices):
 * - `polite` — the default. Wait for the user to finish their current
 *   activity before reading. Use for success toasts, "saved", etc.
 * - `assertive` — interrupt the user. Reserved for errors that require
 *   attention now (form failed, network lost, permission denied).
 */

export type Politeness = 'polite' | 'assertive';

export interface AnnounceOptions {
  /**
   * Milliseconds after which the live region is cleared so the same
   * message can be re-announced later. Set to `0` for sticky messages.
   * Defaults to 4 000 ms — long enough for assistive tech to finish
   * speaking even on slow rates.
   */
  clearAfterMs?: number;
}

/**
 * Minimal contract the announcer needs from a live region. `LiveRegion`
 * provides a real `HTMLElement`, but the contract is loose so tests can
 * pass a fake without JSDOM.
 */
type LiveRegionTarget = Pick<HTMLElement, 'textContent'>;

const DEFAULT_CLEAR_MS = 4_000;

const registered: Record<Politeness, LiveRegionTarget | null> = {
  polite: null,
  assertive: null,
};

const pendingClears: Record<Politeness, ReturnType<typeof setTimeout> | null> = {
  polite: null,
  assertive: null,
};

function cancelPendingClear(level: Politeness) {
  const timer = pendingClears[level];
  if (timer !== null) {
    clearTimeout(timer);
    pendingClears[level] = null;
  }
}

/**
 * Registers a live region under the given politeness. The latest
 * registration wins (matches React's mount order under StrictMode).
 */
export function registerLiveRegion(level: Politeness, region: HTMLElement): void {
  registered[level] = region;
}

/**
 * Unregisters the given region IF it is still the active one for the
 * politeness. A no-op when a different element has since registered —
 * this matches the React unmount-after-remount order under fast-refresh
 * and avoids zombie-unmount races wiping a live region the user
 * actually cares about.
 */
export function unregisterLiveRegion(level: Politeness, region: HTMLElement): void {
  if (registered[level] === region) {
    registered[level] = null;
  }
  cancelPendingClear(level);
}

/** Inspection helper used by tests. */
export function getRegisteredLiveRegion(level: Politeness): LiveRegionTarget | null {
  return registered[level];
}

/**
 * Announces a message into the matching live region. No-op when:
 * - no region is registered for that politeness yet
 * - the message is empty or whitespace-only (a stale `''` would otherwise
 *   trigger some screen readers to re-announce the previous text)
 */
export function announce(
  message: string,
  level: Politeness = 'polite',
  options: AnnounceOptions = {},
): void {
  if (message.trim().length === 0) return;
  const region = registered[level];
  if (region === null) return;

  region.textContent = message;
  cancelPendingClear(level);

  const clearAfter = options.clearAfterMs ?? DEFAULT_CLEAR_MS;
  if (clearAfter > 0) {
    pendingClears[level] = setTimeout(() => {
      // Only clear if our message is still showing — a later announce()
      // might have overwritten it already.
      if (region.textContent === message) {
        region.textContent = '';
      }
      pendingClears[level] = null;
    }, clearAfter);
  }
}

/**
 * Resets the module to a fresh state. Tests call this in `beforeEach`
 * so cross-test state cannot leak. NOT exported via `index.ts` — call
 * sites in the app should never need it.
 */
export function resetAnnouncerForTests(): void {
  for (const level of ['polite', 'assertive'] as const) {
    cancelPendingClear(level);
    registered[level] = null;
  }
}
