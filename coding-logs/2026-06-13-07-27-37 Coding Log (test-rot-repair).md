# Coding Log — Test-Rot Repair (pre-existing reds on main)

**Date**: 2026-06-13
**Branch**: `fix/test-rot-repair`
**Scope**: The known pre-existing test rot on main — org-structure unit test,
create-project wizard e2e family, batch1 admin e2e — plus two real product
bugs the repair surfaced.

## Baseline (ground truth before any change)

- `npx vitest run src/app/api/org-structure/route.test.ts` → 1 failed / 4 passed.
- Playwright baseline of the 5 suspect specs → **10 failed / 3 passed** (14.3m):
  - `project-create-and-shell` (2 of 4 red), `project-bootstrap-empty-state`
    (2/2 red), `project-evm-quality-crud` (1/1 red),
    `project-create-demo-scenario1` (3/3 red),
    `batch1-documents-change-request-admin` (2 of 3 red).
- `batch2-user-daily-report-gantt` separately baselined → 3/3 red.

## Root causes

1. **org-structure asTree test** — seed re-themed NSM → RID: `dept-001` moved
   under the deputy-DG bureau `dept-om` and has no children; the test still
   expected it as a direct child of `dept-root` with children.
2. **Wizard e2e family** — PR-D1b/D1c redesigned the wizard; submit is now the
   shared `WizardActionFooter`'s `บันทึก` button (rendered on every step so
   one-pass specs keep working). The old `สร้างโครงการ (Create Project)` button
   only survives in dead code (`_components/ActionBar.tsx`, zero imports).
   `project-evm-quality-crud` also used the stale `(Execution Model)` label
   (now `(Delivery Method)`). `demo-scenario1` expected the pre-re-theme demo
   project (`อาคาร C`); demo fill now seeds the คลองรังสิต RID project.
   The reload test expected the NSM project name + a hardcoded count of 5.
3. **batch1 CR test → real product bug** — `CreateChangeRequestModal` used
   `<Input type="number">` for budget/schedule impact, so AntD emitted string
   values; the strict `z.number()` API schema 400s every create from the UI.
   The dialog stayed open and the test's next click was mask-blocked.
4. **batch1/batch2 admin tests** — org-unit modal gained a required `kind`
   select the specs never filled; both org pickers became `TreeSelect`
   (`OrgUnitTreePicker`) whose dropdown DOM differs from plain Select; parent
   `อพวช.` no longer exists (root is `กรมชลประทาน`).
5. **Connection-pool exhaustion (infra product bug)** — `getDb()` cached the
   postgres-js client at module scope; `next dev` evaluates the module once
   per route graph → one 10-conn pool per graph → >100 connections during a
   long e2e run → `FATAL: too many clients` → login-options 500 → every
   subsequent spec failed at login with an empty user list.
6. **routability test false-red** — pinned routes against
   `.next/server/app-paths-manifest.json` even when `.next` came from
   `next dev` (lazily-filled manifest). Now only pins when `.next/BUILD_ID`
   (production build marker) exists.

## Changes

- `src/app/api/org-structure/route.test.ts` — assert RID hierarchy
  (`dept-root` → `dept-om` → contains `dept-001`).
- `src/app/(dashboard)/projects/[id]/change-request/_components/CreateChangeRequestModal.tsx`
  — `BahtInput` for budget impact, `InputNumber` for schedule impact (real
  numbers reach the strict schema).
- `src/lib/db/client.ts` — real-Postgres client cached on `globalThis`
  (one pool per process under `next dev`); pglite stays module-scoped so
  vitest `resetModules` isolation is unchanged; `__setDbForTesting(null)`
  clears the global cache.
- `src/lib/mock-upload-storage.routability.test.ts` — manifest pin gated on
  `BUILD_ID`.
- e2e specs: `project-create-and-shell`, `project-bootstrap-empty-state`,
  `project-evm-quality-crud`, `project-create-demo-scenario1`,
  `batch1-documents-change-request-admin`, `batch2-user-daily-report-gantt`
  — บันทึก submit, current labels/copy, `selectAntTreeOption` helper,
  dynamic project count + table search in the reload test.

## Descoped (documented, not silently skipped)

- `batch2` tests 2–3 (daily-report WBS links, gantt predecessors): they
  reference the pre-re-theme proj-002 dataset (`Booking API`, `พัฒนา Frontend
  และ Dashboard`) which no longer exists in fixtures or bootstrap data.
  Repairing them is a re-theming rewrite against the current proj-002
  WBS/gantt content — separate task.
- Dead `ActionBar.tsx` left in place (zero imports; deleting product code is
  not needed for this repair).

## Verification

- vitest full suite `--maxWorkers=4`: green (143 files / 1688 tests) after fixes.
- typecheck + lint: clean. Build: see PR.
- Repaired e2e specs run serially against a warmed dev server: see PR.
