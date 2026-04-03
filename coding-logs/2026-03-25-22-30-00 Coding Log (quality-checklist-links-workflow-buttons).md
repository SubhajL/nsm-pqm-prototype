# Coding Log: Quality Checklist Links + Inspection Workflow Buttons

**Date:** 2026-03-25
**Scope:** Make ITP checklist items clickable links to inspection detail pages, and implement the 3-button inspection workflow (Draft → Confirmed → Signed) across all projects

---

## What Changed

### 1. `InspectionRecord` Type — Workflow Status
**File:** `src/types/quality.ts`
- Added `WorkflowStatus` type: `'draft' | 'confirmed' | 'signed'`
- Added `workflowStatus: WorkflowStatus` field to `InspectionRecord`

### 2. Mock Data — Workflow Status
**File:** `src/data/inspections.json`
- Added `workflowStatus: "confirmed"` to seed inspection record (insp-001)

### 3. Generated Projects — Workflow Status
**File:** `src/lib/generated-project-data.ts`
- Passed inspections get `workflowStatus: 'signed'`
- Conditional inspections get `workflowStatus: 'confirmed'`

### 4. API — PATCH Handler for Workflow Transitions
**File:** `src/app/api/quality/inspections/route.ts`
- Added `PATCH` handler with state machine validation
- Valid transitions: `draft→confirmed`, `confirmed→signed`
- Returns 400 for invalid transitions
- New records created via POST default to `workflowStatus: 'draft'`

### 5. React Query Hook — `useUpdateInspectionStatus`
**File:** `src/hooks/useQuality.ts`
- New mutation hook calling `apiPatch('/quality/inspections', { id, workflowStatus })`
- Invalidates `['inspections']` and `['inspection']` queries on success

### 6. Quality Page — ITP Items as Clickable Links
**File:** `src/app/(dashboard)/projects/[id]/quality/page.tsx`
- ITP items with linked inspection records render as `<Button type="link">`
- Clicking navigates to `/projects/[id]/quality/inspection/[inspectionId]`
- ITP items without inspections remain plain text

### 7. Inspection Detail Page — Workflow Buttons Wired
**File:** `src/app/(dashboard)/projects/[id]/quality/inspection/[inspectionId]/page.tsx`
- Added workflow status badge in page header and bottom action card
- **บันทึกร่าง**: Enabled only in `draft` state, shows success toast
- **ยืนยันผลตรวจ**: Enabled only in `draft` state, transitions to `confirmed` via PATCH API
- **ลงนามดิจิทัล**: Enabled only in `confirmed` state, transitions to `signed` via PATCH API
- In `signed` state: all buttons disabled, badge shows "ลงนามแล้ว (Signed)"

---

## E2E Tests
**File:** `tests/e2e/project-quality-workflow.spec.ts` — 5 tests

| Test | What it validates |
|------|-----------------|
| ITP item with inspection is clickable | Click "เทคอนกรีต" navigates to inspection detail |
| ITP item without inspection is plain text | "ถอดแบบหล่อ" is not a link button |
| Workflow status and button states | Confirmed state: Draft/Confirm disabled, Sign enabled |
| ลงนามดิจิทัล transitions to signed | Click sign → "ลงนามแล้ว" badge, all buttons disabled |
| proj-002 quality page works | ITP table and inspection records load for generated project |

---

### 8. Iteration 2: Fail-Item Blocking + Resolve Button

**Problem**: Inspections with failed checklist items should not allow ยืนยัน or ลงนาม. Engineers need a way to resolve failed items.

**Fix — API (PATCH extended)**:
- PATCH now handles `checklistItemId + resolveAsPass` to flip a checklist item from fail→pass
- When resolved: item note appended with "→ แก้ไขแล้ว โดย [name]"
- If ALL items pass after resolve: `overallResult` → `'pass'`, autoNCR removed
- Workflow transitions (`confirmed`/`signed`) blocked server-side when any item is still fail

**Fix — Inspection Detail Page**:
- Red alert shown when fail items exist: "ยังมี X รายการที่ไม่ผ่าน"
- ยืนยันผลตรวจ + ลงนามดิจิทัล disabled when `hasFailItems`
- "แก้ไขเป็นผ่าน" green button per fail row (visible to PM/Engineer/Admin)
- On resolve: success toast "แก้ไข [item] เป็นผ่านแล้ว — แจ้ง PM เรียบร้อย"

**Fix — Hook**:
- Added `useResolveChecklistItem(projectId)` mutation hook

---

## Quality Gates

| Gate | Status |
|------|--------|
| `npm run typecheck` | Pass |
| `npm run lint` | Pass |
| `npm run build` | Pass |
| `npm run e2e` (quality workflow) | 5/5 Pass |

---

## Wiring Verification

| Component | Call Site | Verified |
|-----------|----------|----------|
| `WorkflowStatus` type | quality.ts → API, hooks, pages | Yes |
| `PATCH /quality/inspections` (workflow) | Inspection detail buttons → `useUpdateInspectionStatus` | Yes |
| `PATCH /quality/inspections` (resolve) | Checklist "แก้ไขเป็นผ่าน" → `useResolveChecklistItem` | Yes |
| `useUpdateInspectionStatus` hook | Inspection detail page | Yes |
| `useResolveChecklistItem` hook | Inspection detail page checklist table | Yes |
| ITP item `<Button type="link">` | Quality page ITP table column render | Yes |
| `workflowStatus` in seed data | inspections.json, generated-project-data.ts | Yes |
| `hasFailItems` blocking logic | Inspection detail page + API validation | Yes |
