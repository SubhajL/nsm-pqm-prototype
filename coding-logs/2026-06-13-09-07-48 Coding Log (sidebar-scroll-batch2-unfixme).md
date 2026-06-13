# Coding Log — Sidebar scroll fix + batch2 un-fixme + e2e blob-upload fix

**Date**: 2026-06-13
**Branch**: `fix/sidebar-scroll-batch2-unfixme`
**Scope**: The two follow-ups flagged at the end of PR #96, plus a local-env
blob-upload bug uncovered while un-fixme-ing batch2 test 2.

## 1. Sidebar scroll (product fix)

**Symptom**: on short viewports the bottom `ออกจากระบบ` (logout) button was
unreachable; e2e specs worked around it with `viewport.height: 1600`.

**Root cause**: the flex-column styles were on the OUTER `<Sider>`
(`.ant-layout-sider`), but AntD renders children inside the non-flex
`.ant-layout-sider-children` block. So the nav's `flex`/`overflowY` and the
footer's `marginTop:auto` were inert — the nav expanded to full content height
and pushed the footer below the fold. (The mobile `<Drawer>` worked because its
`styles.body` IS the flex container.)

**Fix** (`src/components/layout/Sidebar.tsx`): wrap `menuNode` in a real
`height:100%; minHeight:0; display:flex; flexDirection:column` div (the direct
parent of header/nav/footer). Nav → `flex:'1 1 auto'; minHeight:0;
overflowY:'auto'` (the `minHeight:0` is the load-bearing flexbox-overflow fix —
without it a flex item won't shrink below content size so `overflow` never
engages). Header + footer → `flexShrink:0`. `<Sider>` → `height:'100vh';
overflow:'hidden'` (was `minHeight:'100vh'` + inert outer flex). Collapsed,
dark-theme, and Drawer paths unchanged; the same wrapper works in both.

Removed the `viewport.height:1600` workarounds from batch1 + batch2 specs;
they now exercise logout at the default 1280×720 and pass.

## 2. batch2 tests 2–3 (test repair, NOT a rewrite)

The `test.fixme` comments claimed proj-002's dataset no longer existed. That
was wrong — the live local DB still has WBS `2.1 พัฒนา Booking API…`,
`2.2 พัฒนา Frontend…` and the matching gantt tasks. The real baseline failure
was PR #96's now-fixed connection-pool exhaustion. So: un-fixme + repair.

- **Test 3** (gantt predecessors): passes as-is after un-fixme. No other change.
- **Test 2** (rich daily report): three genuine issues found by running it —
  1. `WBS ที่เกี่ยวข้อง` is a `mode="multiple"` Select; clicking an option does
     NOT close the dropdown, so its overlay intercepted the next click. Added
     `page.keyboard.press('Escape')` to dismiss it.
  2. The stale `expect(signatures.reporter.signed).toBeTruthy()` assertion: the
     canvas signature drawing is skipped in E2E, so `signed` is always false.
     Removed it; the `name` assertion stays.
  3. (see §3) the photo upload threw a `BlobError`, so the report never
     persisted.

## 3. e2e photo-upload blob bug (test-infra fix)

**Symptom**: `POST /api/daily-reports` returned 200 but logged
`BlobError: Vercel Blob: Cannot use private access on a public store`, and the
report never persisted (test 2's `latestReport` was undefined).

**Root cause**: `shouldUseBlobStorage()` is true whenever
`BLOB_READ_WRITE_TOKEN` is set — and it IS, in the committed `.env.local`. The
uploader (`persistBlobUpload`) requests `access:'private'` but the dev/preview
blob store is public, so every photo/attachment upload throws. The intended
local path is `persistFilesystemUpload` (writes to `public/mock-uploads/`),
reached only when the token is absent. This broke ALL photo-upload e2e locally
(test 2 AND batch4).

**Fix** (`playwright.config.ts`): clear `BLOB_READ_WRITE_TOKEN=` in the
webServer command so local e2e uses filesystem uploads. `@next/env` does not
re-populate an already-set (empty) process.env key, so `.env.local` no longer
overrides it. Verified: test 2 passes (11.1s, zero BlobErrors) and batch4 still
passes (its `expectUploadUrl` already accepts the `/mock-uploads/…` path).

**Flagged (out of scope)**: the `access:'private'` vs public-store mismatch
could also fail real uploads in any environment whose blob store is public —
worth confirming the prod/preview store access mode separately. Not fixed here.

## Verification

- Affected e2e at default 1280×720 (Playwright-spawned server, no contention):
  batch1 3/3, batch2 3/3, batch4 1/1 — **7 passed (58.9s)**.
- typecheck + lint: clean.
- vitest `--maxWorkers=4`: clean (see PR; 3× flake gate).
- No new exports → no wiring needed.

**Note on a poisoned run**: an earlier verification ran 3× vitest CONCURRENTLY
with a 15-min e2e run → CPU/IO contention produced `browserType.launch` timeouts
and 13 spurious vitest fails. Re-running each alone was clean. Lesson: never run
the e2e suite and a multi-pass vitest gate simultaneously on this machine.
