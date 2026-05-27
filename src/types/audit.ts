import type { UserRole } from '@/types/admin';

/**
 * Immutable structured audit event.
 *
 * Per MVP plan PR-05: every successful write mutation in the system emits
 * exactly one `AuditEvent` with full evidentiary context. The store is
 * append-only — events are never updated or deleted.
 *
 * Schema notes (each field's role in the audit trail):
 *
 *   - `id`            stable monotonic identifier (`evt-{uuid}`)
 *   - `timestamp`     ISO 8601 UTC at the moment of persistence
 *   - `requestId`     per-HTTP-request UUID (set in middleware.ts, propagated
 *                     via the `x-request-id` header). Lets us correlate every
 *                     event emitted within a single request.
 *   - `actorId/Role`  who performed the action (null for unauthenticated /
 *                     system-initiated events such as `logout` on a stale
 *                     cookie). Role is snapshotted at the time of action so
 *                     later role changes don't rewrite history.
 *   - `action`        domain action name. For matrix-gated actions this is the
 *                     PR-03 `Action` value (e.g. `edit_basic`); other allowed
 *                     values include `login`, `logout`, `export`,
 *                     `edit_org_structure`, `edit_user`.
 *   - `resourceType`  the kind of entity touched (`project`, `wbs`, `boq`, ...)
 *   - `resourceId`    the touched entity's id
 *   - `projectId`     for project-scoped events; null for org-wide actions
 *                     (admin, login, logout)
 *   - `before/after`  entity snapshot before/after the mutation. `null` for
 *                     creates (before) or deletes (after). Snapshots are
 *                     `structuredClone`d at capture time so later mutations
 *                     can't leak through references.
 *   - `decisionReason`  optional human/system rationale for the decision
 *                     (e.g. `approved`, `rejected: out of scope`, `auto-NCR`).
 *   - `authorityBasis`  optional citation for *why* the actor was permitted to
 *                     perform the action (e.g. `AUTHZ_MATRIX:approve_milestone`,
 *                     `SOP-8.1`). Useful in ก.พ.ร./auditor walkthroughs.
 *   - `ipAddress`     extracted from `x-forwarded-for` (Vercel) or null in
 *                     non-proxied dev.
 *   - `userAgent`     extracted from `user-agent` header.
 */
export interface AuditEvent {
  id: string;
  timestamp: string;
  requestId: string;
  actorId: string | null;
  actorRole: UserRole | null;
  action: string;
  resourceType: string;
  resourceId: string;
  projectId: string | null;
  before: unknown | null;
  after: unknown | null;
  decisionReason: string | null;
  authorityBasis: string | null;
  ipAddress: string | null;
  userAgent: string | null;
}
