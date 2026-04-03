# Coding Log: Gantt Toolbar — Baseline/Current/Compare View Modes & Day/Week/Month Time Scales

**Date:** 2026-03-25
**Scope:** Make the 6 Gantt toolbar buttons (Baseline, ปัจจุบัน, เปรียบเทียบ, วัน, สัปดาห์, เดือน) functional across all projects

---

## What Changed

### 1. GanttTask Type — Baseline Date Fields
**File:** `src/types/gantt.ts`
- Added `baseline_start_date?: string` and `baseline_end_date?: string` to `GanttTask`
- Represents the original approved planned schedule (snapshot)

### 2. Mock Data — Baseline Dates for proj-001
**File:** `src/data/gantt-tasks.json`
- Added `baseline_start_date` and `baseline_end_date` to all 18 seed tasks
- Baseline dates are slightly earlier than actual dates to demonstrate plan-vs-actual slip
- Actual `start_date`/`end_date` values unchanged — no impact on existing schedule health

### 3. Generated Projects — Baseline Dates
**File:** `src/lib/generated-project-data.ts`
- `buildGanttData()` now populates `baseline_start_date` and `baseline_end_date` on all generated tasks
- For in-progress tasks (0 < progress < 100), baseline dates are 3 days earlier than actual dates
- Actual task dates unchanged — no regression on schedule health derivations

### 4. API — Baseline Dates on New Tasks
**File:** `src/app/api/gantt/[projectId]/route.ts`
- POST handler sets `baseline_start_date` and `baseline_end_date` to the creation dates
- Baseline dates are frozen at creation time (as per PM methodology)

### 5. Gantt Page — View Mode & Time Scale Functionality
**File:** `src/app/(dashboard)/projects/[id]/gantt/page.tsx`

#### View Mode Buttons (Baseline / ปัจจุบัน / เปรียบเทียบ)
- **Baseline**: Shows gray bars using `baseline_start_date`/`baseline_end_date`, no progress fill
- **ปัจจุบัน (Current)**: Shows bars with progress fill using actual dates (existing default)
- **เปรียบเทียบ (Compare)**: Shows both — thin dashed baseline bar above, colored current bar below
- Milestone markers also switch between baseline (gray diamond) and current (amber diamond)

#### Time Scale Buttons (วัน / สัปดาห์ / เดือน)
- **วัน (Day)**: Individual day numbers in timeline header
- **สัปดาห์ (Week)**: W1, W2, W3... labels in timeline header
- **เดือน (Month)**: Thai month abbreviations (existing default)

#### Functions Added
- `getWeekLabels(timeline)` — generates week labels with W1, W2, etc.
- `getDayLabels(timeline)` — generates day labels with individual day numbers
- `getTimelineLabels(timeline, timeScale)` — dispatcher for all three scales
- `GanttRow` extended with `baseline_start_date?` and `baseline_end_date?`
- `TimelineBar` extended with `viewMode`, `baselineStartDate`, `baselineEndDate` props
- `TimelineHeader` extended with `timeScale` prop

### 6. Playwright Config
**File:** `playwright.config.ts`
- Changed `reuseExistingServer: false` → `!process.env.CI` to allow local dev server reuse

---

## E2E Tests Added
**File:** `tests/e2e/project-gantt-toolbar.spec.ts` — 9 tests

| Test | What it verifies |
|------|-----------------|
| default view is ปัจจุบัน and เดือน | Default state, month labels visible, no baseline bars |
| Baseline view shows baseline bars | Clicking Baseline renders `data-testid="baseline-bar"` |
| เปรียบเทียบ shows both bars | Compare mode shows baseline + current progress bars |
| switching back to ปัจจุบัน hides baseline | Baseline bars removed when switching view mode |
| Baseline view shows milestone markers | Baseline milestone diamonds rendered |
| สัปดาห์ scale shows week labels | W1, W2 labels appear in header |
| วัน scale makes table wider | Day view scroll width > 2x month view scroll width |
| สัปดาห์ scale expands timeline | Week view scroll width > month view scroll width |
| switching back to เดือน restores months | Month labels return after scale change |
| view mode works on proj-002 | Shared functionality verified on another project |

---

## Iteration 2: Time Scale Width Fix (2026-03-25)

### Problem
When switching to week or day scale, the Gantt bars stayed the same pixel width because:
1. Bars used percentage positioning inside a fixed-width column
2. The column never expanded — only header labels changed
3. Left columns consumed too much space, leaving the timeline cramped

### Fix
1. **`getTimelineColumnWidth()`** — calculates explicit column width:
   - Day: `totalDays * 28px` (e.g., 177 days → 4,956px)
   - Week: `ceil(totalDays/7) * 60px` (e.g., 26 weeks → 1,560px)
   - Month: `undefined` (natural flex)
2. **`getColumnWidths()`** — shrinks left columns in compact mode (day/week):
   - Activity: 220→180, Owner: 90→70, Progress: 80→60, Predecessors: 220→140, Status: 260→180
3. **Dynamic `scroll.x`** — sum of all column widths enables proper horizontal scrolling
4. **TimelineHeader** — removed broken custom width logic, now fills column naturally

---

## Quality Gates

| Gate | Status |
|------|--------|
| `npm run typecheck` | ✅ Pass |
| `npm run lint` | ✅ Pass |
| `npm run build` | ✅ Pass |
| `npm run e2e` (toolbar tests) | ✅ 10/10 Pass |
| Existing Gantt CRUD tests | ✅ 3/4 Pass (1 pre-existing failure on proj-002) |

---

## Wiring Verification

| Component | Call Site | Verified |
|-----------|----------|----------|
| `baseline_start_date` on GanttTask | gantt-tasks.json, generated-project-data.ts, API POST | ✅ |
| `getWeekLabels()` | `getTimelineLabels()` → `TimelineHeader` | ✅ |
| `getDayLabels()` | `getTimelineLabels()` → `TimelineHeader` | ✅ |
| `viewMode` prop on TimelineBar | Gantt page columns → `TimelineBar` render | ✅ |
| `timeScale` prop on TimelineHeader | Gantt page columns → `TimelineHeader` render | ✅ |
| `getTimelineColumnWidth()` | Gantt page → timeline column `width` + `scrollX` calc | ✅ |
| `getColumnWidths()` | Gantt page → all column `width` props | ✅ |
| `data-testid="baseline-bar"` | E2E tests locate baseline bars | ✅ |
| `data-testid="baseline-milestone"` | E2E tests locate baseline milestones | ✅ |
