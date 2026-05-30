# Gantt Chart — Hand-Rolled AntD Table Implementation

**Technology**: Hand-rolled Gantt using Ant Design `<Table>` + inline CSS (no third-party Gantt library)
**Parent Context**: [../../CLAUDE.md](../../../CLAUDE.md)
**Primary location**: `src/app/(dashboard)/projects/[id]/gantt/page.tsx`

## Why Hand-Rolled

No Gantt npm package is installed (verify with `grep -i gantt package.json`). The Gantt view is built as a custom Ant Design `<Table>` with a calendar header and absolutely-positioned bars per row. This keeps the prototype free of large GPL/commercial dependencies while still demonstrating the planning view.

## Key Patterns

### 1. Row-Tree Builder
- WBS items are flattened from `src/data/wbs.json` into a list of rows ordered by parent-child traversal.
- Each row carries `level` (indent depth) and `hasChildren` flags so the AntD `<Table>` `expandable` API can render the tree controls.
- Phase/parent rows render as summary bars (spanning the date range of their children); leaf tasks render with start/end + progress.

### 2. Custom Date Math
- Date arithmetic is done with plain `Date` objects (no `dayjs`/`moment` in this view) — `dayMs = 24 * 60 * 60 * 1000`, `Math.round((d - origin) / dayMs)`.
- The visible window is computed from `min(plannedStart)` and `max(plannedEnd)` across all tasks, padded by a few days.
- Bar `left` and `width` are computed as percentages of the window so the table column resizes responsively.

### 3. Baseline Bar Overlay via `<style jsx>`
- Each row renders TWO overlapping bars in the timeline column: a baseline bar (planned dates) and an actual bar (actual progress).
- Colors and stripes are defined inline via Next.js `<style jsx>` rather than Tailwind, because the bar geometry depends on per-row computed `left`/`width` values that cannot be expressed as static utility classes.
- The baseline bar uses a striped background to visually distinguish "planned" from "actual" without needing a legend.

### 4. Progress Propagation via `project-execution-sync.ts`
- When a user edits a leaf task's progress in the Gantt, the change is written through `src/lib/project-execution-sync.ts` rather than directly to the WBS store.
- `project-execution-sync.ts` recomputes parent/phase progress as a weighted average of child progress and mutates the in-memory WBS store; the underlying repository (Postgres in `db` mode, in-memory cache in `in_memory` mode) is the authoritative persistence.
- This keeps Gantt, WBS tree, and EVM views in sync without each view needing its own propagation logic.

## What This Does Not Have

- No critical-path computation (no CPM algorithm in the codebase).
- No drag-to-resize bars (read/edit happens via row-level controls and forms).
- No dependency arrows between bars (dependencies live in the data model but are not drawn).
- No zoom controls beyond the static day/week/month scale chosen at render time.

If/when these are needed, add them inside the existing `page.tsx` — do NOT pull in a heavy Gantt library without a CLAUDE.md update.
