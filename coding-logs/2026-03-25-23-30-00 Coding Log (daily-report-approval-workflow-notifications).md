# Coding Log: Daily Report Approval Workflow + Auto-Notifications

**Date:** 2026-03-25
**Scope:** Implement full approval workflow with role-based buttons and auto-generated notifications

---

## What Changed

### 1. Notification Store Extraction
**File:** `src/lib/notification-store.ts` (new)
- Extracted notification in-memory store from API route to shared lib
- `getNotificationStore()` — singleton accessor
- `pushNotification(notification)` — adds notification to store

### 2. Notification API Route Refactored
**File:** `src/app/api/notifications/route.ts`
- Now uses `getNotificationStore()` from shared lib instead of module-level array
- No functional change to GET/PATCH handlers

### 3. Daily Report PATCH — Auto-Notification Generation
**File:** `src/app/api/daily-reports/[id]/route.ts`
- On `submitted` → creates notification: "[Report] ส่งมาเพื่อขออนุมัติ" (severity: info, for PM)
- On `approved` → creates notification: "[Report] ได้รับการอนุมัติ" (severity: success, for reporter)
- On `rejected` → creates notification: "[Report] ถูกตีกลับ" (severity: warning, for reporter)
- Each notification includes `projectId`, `actionUrl`, and descriptive `message`

### 4. Role-Based Button Visibility Fix
**File:** `src/app/(dashboard)/projects/[id]/daily-report/page.tsx`
- **Submit/Resubmit button**: Now hidden for PM/Coordinator/Admin (`canReview` roles)
  - Only Engineer/Reporter sees "ส่งอนุมัติ" or "ส่งใหม่"
- **Approve/Reject buttons**: Unchanged — only visible to PM/Coordinator/Admin
- This ensures:
  - PM sees: อนุมัติรายงาน + ตีกลับรายงาน (for submitted reports)
  - Engineer sees: ส่งอนุมัติ (for drafts) or ส่งใหม่ (for rejected reports)

### 5. React Query Invalidation
**File:** `src/hooks/useDailyReports.ts`
- `useUpdateDailyReportStatus` now also invalidates `['notifications']` query
- Ensures notification bell badge updates immediately after status change

---

## Approval Workflow Flow

```
Engineer creates report (draft)
  ↓ "ส่งอนุมัติ"
Report status: submitted → Notification to PM: "ส่งมาเพื่อขออนุมัติ"
  ↓
PM opens report, sees "อนุมัติรายงาน" + "ตีกลับรายงาน"
  ↓ "ตีกลับรายงาน"
Report status: rejected → Notification to Engineer: "ถูกตีกลับ"
  ↓
Engineer opens, sees "ส่งใหม่" (PM does NOT see this button!)
  ↓ "ส่งใหม่"
Report status: submitted → Notification to PM: "ส่งมาเพื่อขออนุมัติ"
  ↓
PM opens, sees approve/reject again
  ↓ "อนุมัติรายงาน"
Report status: approved → Notification to Engineer: "ได้รับการอนุมัติ"
```

---

## E2E Tests
**File:** `tests/e2e/daily-report-approval-workflow.spec.ts` — 5 tests

| Test | What it validates |
|------|-----------------|
| PM sees approve/reject for submitted, no submit button | Role-based button visibility |
| PM rejects → status changes to rejected | Rejection workflow + status history |
| Engineer sees resubmit button on rejected report | Engineer sees ส่งใหม่, not approve/reject |
| Engineer resubmits → status changes to submitted | Resubmission workflow + history |
| PM approves resubmitted report | Full cycle: submit → reject → resubmit → approve |

---

## Quality Gates

| Gate | Status |
|------|--------|
| `npm run typecheck` | Pass |
| `npm run lint` | Pass |
| `npm run build` | Pass |
| `npm run e2e` (approval workflow) | 5/5 Pass |

---

## Wiring Verification

| Component | Call Site | Verified |
|-----------|----------|----------|
| `notification-store.ts` | notifications API route + daily-report PATCH | Yes |
| `pushNotification()` | daily-report PATCH handler (3 status transitions) | Yes |
| `!canReview` guard on submit button | daily-report page.tsx line 970 | Yes |
| Notifications query invalidation | useDailyReports.ts → useUpdateDailyReportStatus | Yes |
