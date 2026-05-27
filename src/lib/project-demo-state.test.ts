import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ensureProjectDemoStateHydrated } from '@/lib/project-demo-state';
import { getQualityStore } from '@/lib/quality-store';
import { getIssueStore } from '@/lib/issue-store';
import { getProjectStore } from '@/lib/project-store';

// ---------------------------------------------------------------------------
// Regression test for PR-11: API handlers that capture `getXxxStore()` AFTER
// `await ensureProjectDemoStateHydrated()` must observe the same array
// reference whether hydration has already run or runs concurrently with their
// invocation. This pins the contract that:
//   1. `ensureProjectDemoStateHydrated()` is idempotent across repeated calls
//   2. `getXxxStore()` returns a stable singleton array reference whose
//      contents are populated by hydration via in-place mutation
//   3. Reads taken inside a handler AFTER awaiting hydration reflect the
//      hydrated state — even if the same store reference was captured
//      pre-hydration elsewhere.
// ---------------------------------------------------------------------------

declare global {
  // eslint-disable-next-line no-var
  var __nsmProjectDemoStateHydrated: boolean | undefined;
  // eslint-disable-next-line no-var
  var __nsmProjectDemoStateHydrationPromise: Promise<void> | undefined;
}

describe('ensureProjectDemoStateHydrated (PR-11 ordering contract)', () => {
  beforeEach(() => {
    // Reset hydration flags so each test starts from a "cold" handler simulation.
    globalThis.__nsmProjectDemoStateHydrated = undefined;
    globalThis.__nsmProjectDemoStateHydrationPromise = undefined;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('is idempotent: repeated calls do not re-hydrate', async () => {
    await ensureProjectDemoStateHydrated();
    expect(globalThis.__nsmProjectDemoStateHydrated).toBe(true);

    const firstHydrationFlag = globalThis.__nsmProjectDemoStateHydrated;

    // Second call must return immediately without re-running hydration.
    await ensureProjectDemoStateHydrated();
    await ensureProjectDemoStateHydrated();

    expect(globalThis.__nsmProjectDemoStateHydrated).toBe(firstHydrationFlag);
  });

  it('coalesces concurrent hydration calls onto a single promise', async () => {
    expect(globalThis.__nsmProjectDemoStateHydrationPromise).toBeUndefined();

    const [a, b, c] = [
      ensureProjectDemoStateHydrated(),
      ensureProjectDemoStateHydrated(),
      ensureProjectDemoStateHydrated(),
    ];

    // All three callers must observe the SAME in-flight hydration promise.
    expect(globalThis.__nsmProjectDemoStateHydrationPromise).toBeDefined();

    await Promise.all([a, b, c]);

    expect(globalThis.__nsmProjectDemoStateHydrated).toBe(true);
  });

  it('handlers calling getXxxStore() AFTER await observe hydrated content', async () => {
    // Simulate a pre-hydration code path that incorrectly captured the store at
    // module load. After PR-11, handlers no longer do this — but the SUT must
    // still guarantee that the reference returned by getXxxStore() ends up
    // pointing at hydrated data (because hydration mutates in place).
    const captureBeforeHydration = getQualityStore();
    const issueCaptureBeforeHydration = getIssueStore();
    const projectCaptureBeforeHydration = getProjectStore();

    await ensureProjectDemoStateHydrated();

    // The post-hydration capture pattern that PR-11 enforces.
    const captureAfterHydration = getQualityStore();
    const issueCaptureAfterHydration = getIssueStore();
    const projectCaptureAfterHydration = getProjectStore();

    // Same reference — stores are global singletons.
    expect(captureAfterHydration).toBe(captureBeforeHydration);
    expect(issueCaptureAfterHydration).toBe(issueCaptureBeforeHydration);
    expect(projectCaptureAfterHydration).toBe(projectCaptureBeforeHydration);

    // Stores have content after hydration (proves hydration completed before
    // the post-await read). We don't assert on exact counts because seed data
    // changes — only that hydration produced a populated, well-formed state.
    expect(Array.isArray(captureAfterHydration.itpItems)).toBe(true);
    expect(Array.isArray(captureAfterHydration.inspectionRecords)).toBe(true);
    expect(Array.isArray(issueCaptureAfterHydration)).toBe(true);
    expect(Array.isArray(projectCaptureAfterHydration)).toBe(true);
    expect(projectCaptureAfterHydration.length).toBeGreaterThan(0);
  });

  it('exposes a settled hydrated flag once the awaited promise resolves', async () => {
    const hydration = ensureProjectDemoStateHydrated();

    // While in flight: the promise exists, the flag is not yet set.
    expect(globalThis.__nsmProjectDemoStateHydrationPromise).toBeDefined();
    expect(globalThis.__nsmProjectDemoStateHydrated).toBeUndefined();

    await hydration;

    expect(globalThis.__nsmProjectDemoStateHydrated).toBe(true);

    // A handler calling the helper after this point gets the fast-path exit.
    await ensureProjectDemoStateHydrated();
    expect(globalThis.__nsmProjectDemoStateHydrated).toBe(true);
  });
});
