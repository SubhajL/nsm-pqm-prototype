/**
 * P-D1 — pure predicate that decides whether a form's current state
 * should block navigation. Kept framework-agnostic so it can be unit-
 * tested under vitest's node env (no jsdom).
 *
 * Rules:
 *  - `dirty=false` → never block.
 *  - `dirty=true && submitting=true` → never block (the user is
 *    intentionally submitting; blocking would interrupt the in-flight
 *    save).
 *  - `dirty=true && submitting=false` → block.
 *
 * The React hook that wires this to `beforeunload` lives separately
 * (`useUnsavedChangesGuard.ts`) so this module has zero runtime deps.
 */

export interface UnsavedGuardState {
  /** Has the form been modified since its last save or open? */
  dirty: boolean;
  /** Is a save mutation currently in flight? */
  submitting: boolean;
}

export function shouldBlockNavigation(state: UnsavedGuardState): boolean {
  if (!state.dirty) return false;
  if (state.submitting) return false;
  return true;
}

/**
 * Default bilingual confirm prompt. Most modern browsers ignore the
 * exact text and show their own generic copy, but a sensible default
 * is still useful for older browsers and our own in-app router
 * intercept.
 */
export const UNSAVED_CHANGES_PROMPT =
  'ออกจากหน้านี้? การเปลี่ยนแปลงที่ยังไม่ได้บันทึกจะหายไป (Leave page? Unsaved changes will be lost.)';
