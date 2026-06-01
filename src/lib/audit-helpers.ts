import { getDb } from '@/lib/db/client';
import { getCurrentApiUser } from '@/lib/project-api-access';
import { getRepositories } from '@/lib/repositories';
import {
  createScopedRepositoryRegistry,
  type RepositoryRegistry,
} from '@/lib/repositories/registry';
import type { AuditEvent } from '@/types/audit';
import type { User } from '@/types/admin';

/**
 * Header name (mirrors middleware.ts/`REQUEST_ID_HEADER`). Kept inline so
 * server-side library code doesn't import from middleware (which Next.js
 * compiles in a separate edge bundle).
 */
const REQUEST_ID_HEADER = 'x-request-id';

/**
 * Pull the per-request UUID set by `middleware.ts`. Returns `null` for
 * synthetic requests that bypass middleware (only seen in unit tests
 * today) — callers should treat `null` as "no upstream id" and fall back
 * to a fresh UUID at `recordAuditEvent` time.
 */
export function getRequestId(request: Request): string | null {
  return request.headers.get(REQUEST_ID_HEADER);
}

function getIpAddress(request: Request): string | null {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    // x-forwarded-for can be a comma-separated list; the originating
    // client IP is the leftmost entry.
    const first = forwarded.split(',')[0]?.trim();
    if (first) return first;
  }

  return request.headers.get('x-real-ip');
}

function getUserAgent(request: Request): string | null {
  return request.headers.get('user-agent');
}

export interface RecordAuditEventInput {
  action: string;
  resourceType: string;
  resourceId: string;
  projectId?: string | null;
  before?: unknown;
  after?: unknown;
  decisionReason?: string | null;
  authorityBasis?: string | null;
  /**
   * Override the actor (defaults to `getCurrentApiUser()`). Used by
   * `/api/auth/login` where the actor isn't yet bound to a cookie at the
   * time of the event.
   */
  actor?: User | null;
}

/**
 * Emit a single immutable `AuditEvent`.
 *
 * The contract is intentionally narrow:
 *   1. Reads the actor from `getCurrentApiUser()` unless one is explicitly
 *      supplied (auth/login). Role is snapshotted at emit time.
 *   2. Pulls the per-request id from the `x-request-id` header
 *      (`middleware.ts` sets it). Falls back to a synthetic uuid only when
 *      middleware was bypassed (unit tests).
 *   3. Reads client IP from `x-forwarded-for` (Vercel) / `x-real-ip` and
 *      user agent from `user-agent`.
 *   4. Appends to the audit-events repository (Database is canonical
 *      post-PR-21). The repository handles durability.
 *
 * **For NON-mutation events** (login, logout, view_document, etc.) this
 * is the right entry point — no transaction is needed.
 *
 * **For mutation events** (state transitions, decisions, money flow)
 * prefer `withTransactionalAudit` below. `recordAuditEvent` runs
 * AFTER the underlying entity write completes, so a crash between the
 * two loses the audit row — unacceptable for the gov't audit trail.
 * Phase 2-A migrated the highest-value mutation routes to the
 * transactional path; remaining routes that still call this helper for
 * mutations are tracked as Phase-2-A follow-up.
 */
export async function recordAuditEvent(
  request: Request,
  input: RecordAuditEventInput,
): Promise<AuditEvent> {
  const actor = input.actor === undefined ? await getCurrentApiUser() : input.actor;
  const requestId = getRequestId(request) ?? `evt-req-${crypto.randomUUID()}`;

  const event = await getRepositories().auditEvents.append({
    requestId,
    actorId: actor?.id ?? null,
    actorRole: actor?.role ?? null,
    action: input.action,
    resourceType: input.resourceType,
    resourceId: input.resourceId,
    projectId: input.projectId ?? null,
    before: input.before === undefined ? null : cloneSnapshot(input.before),
    after: input.after === undefined ? null : cloneSnapshot(input.after),
    decisionReason: input.decisionReason ?? null,
    authorityBasis: input.authorityBasis ?? null,
    ipAddress: getIpAddress(request),
    userAgent: getUserAgent(request),
  });

  return event;
}

function cloneSnapshot<T>(value: T): T {
  if (value === null || value === undefined) return value;
  return structuredClone(value);
}

/**
 * Audit-event appender available to the `withTransactionalAudit` callback.
 * Same input shape as `recordAuditEvent` (minus the implicit `request`,
 * which is captured by the outer call), but the write goes through the
 * transaction-scoped repository so it commits or rolls back atomically
 * with the rest of the callback.
 */
export type TransactionalAuditAppender = (
  input: RecordAuditEventInput,
) => Promise<AuditEvent>;

/**
 * Phase 2-A — Run a mutation + its audit event inside a single
 * `db.transaction(...)`.
 *
 * Closes the team-lead review concern that mutation and audit append are
 * NOT atomic today: `recordAuditEvent` runs AFTER the repo write, so a
 * crash between the two loses the audit entry. This helper opens a
 * transaction, builds a scoped repository registry bound to that
 * transaction, and exposes an `appendAudit` function that emits the
 * audit event through the same transaction. Both commit together or
 * roll back together.
 *
 * Usage pattern:
 *
 * ```ts
 * const updated = await withTransactionalAudit(request, async (txRepos, appendAudit) => {
 *   const result = await txRepos.changeRequests.update(id, patch);
 *   await appendAudit({
 *     action: 'transition_change_request',
 *     resourceType: 'change_request',
 *     resourceId: id,
 *     projectId,
 *     before,
 *     after: result,
 *     decisionReason: `${oldStatus} → ${newStatus}`,
 *     authorityBasis: '...',
 *     actor: currentUser,
 *   });
 *   return result;
 * });
 * ```
 *
 * NOTE on scope: only the writes performed via `txRepos` (and the
 * `appendAudit` call) participate in the transaction. Lookups done
 * BEFORE `withTransactionalAudit` (e.g. `getCurrentApiUser`,
 * `repos.X.findById` outside the helper) use the singleton registry
 * and do NOT see uncommitted state — that's intentional for the
 * pre-check pattern most routes follow.
 */
export async function withTransactionalAudit<T>(
  request: Request,
  callback: (
    txRepos: RepositoryRegistry,
    appendAudit: TransactionalAuditAppender,
  ) => Promise<T>,
): Promise<T> {
  // Ensure the seed has run before opening the transaction. Calling
  // `getRepositories()` here forces the lazy migrate+seed promise to
  // resolve in the parent scope — `createScopedRepositoryRegistry`
  // intentionally skips that gate, so the parent must do it.
  await getRepositories().auditEvents.list();

  const db = getDb();
  const requestId = getRequestId(request) ?? `evt-req-${crypto.randomUUID()}`;
  const ipAddress = getIpAddress(request);
  const userAgent = getUserAgent(request);

  // Pre-fetch the cookie-bound user BEFORE opening the transaction.
  // pglite serialises queries on a single connection; making a fresh
  // singleton-Db query from inside the tx callback would deadlock
  // (the tx is already holding the connection). Doing the lookup
  // here means the captured user can be used inside the tx without
  // a second round-trip.
  const defaultActor = await getCurrentApiUser();

  return db.transaction(async (tx) => {
    // `tx` is `PgTransaction<...>` which extends `PgDatabase`. The repo
    // internals only use the query API shared between the two, so
    // structurally `tx` is interchangeable with the `Db` union — we
    // assert the assignment via a single, narrow cast.
    const txRepos = createScopedRepositoryRegistry(tx as unknown as ReturnType<typeof getDb>);

    const appendAudit: TransactionalAuditAppender = async (input) => {
      const actor = input.actor === undefined ? defaultActor : input.actor;
      return txRepos.auditEvents.append({
        requestId,
        actorId: actor?.id ?? null,
        actorRole: actor?.role ?? null,
        action: input.action,
        resourceType: input.resourceType,
        resourceId: input.resourceId,
        projectId: input.projectId ?? null,
        before: input.before === undefined ? null : cloneSnapshot(input.before),
        after: input.after === undefined ? null : cloneSnapshot(input.after),
        decisionReason: input.decisionReason ?? null,
        authorityBasis: input.authorityBasis ?? null,
        ipAddress,
        userAgent,
      });
    };

    return callback(txRepos, appendAudit);
  });
}
