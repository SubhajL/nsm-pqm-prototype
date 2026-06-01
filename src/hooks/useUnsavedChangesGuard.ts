'use client';

import { useEffect } from 'react';

import {
  shouldBlockNavigation,
  UNSAVED_CHANGES_PROMPT,
  type UnsavedGuardState,
} from '@/lib/unsaved-changes-guard';

/**
 * P-D1 — React hook that installs a `beforeunload` listener while the
 * guard predicate says navigation should be blocked. The browser
 * shows its own confirm dialog (modern browsers ignore our string but
 * we set one anyway for the few that don't, and for in-app code paths
 * that read `UNSAVED_CHANGES_PROMPT` directly).
 *
 * Note: This hook does NOT intercept Next.js client-side route changes
 * — that would require integrating with the router, which is left to
 * the consumer page (it can call `shouldBlockNavigation` itself before
 * `router.push`). Browser-level reload / close / back-button is the
 * canonical guarantee this hook provides.
 */
export function useUnsavedChangesGuard(state: UnsavedGuardState): void {
  useEffect(() => {
    if (!shouldBlockNavigation(state)) return;

    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      // Setting `returnValue` is required for the prompt to appear in
      // older Chrome/Firefox. Modern browsers display their own text.
      event.returnValue = UNSAVED_CHANGES_PROMPT;
      return UNSAVED_CHANGES_PROMPT;
    };

    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [state]);
}
