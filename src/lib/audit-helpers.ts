import { getCurrentApiUser } from '@/lib/project-api-access';
import { persistProjectDemoState } from '@/lib/project-demo-state';
import { getRepositories } from '@/lib/repositories';
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
 * Emit a single immutable `AuditEvent` for a successful write mutation.
 *
 * The contract is intentionally narrow:
 *   1. Reads the actor from `getCurrentApiUser()` unless one is explicitly
 *      supplied (auth/login). Role is snapshotted at emit time.
 *   2. Pulls the per-request id from the `x-request-id` header
 *      (`middleware.ts` sets it). Falls back to a synthetic uuid only when
 *      middleware was bypassed (unit tests).
 *   3. Reads client IP from `x-forwarded-for` (Vercel) / `x-real-ip` and
 *      user agent from `user-agent`.
 *   4. Appends to the append-only store.
 *   5. Persists the snapshot durably via `persistProjectDemoState` so the
 *      event survives a server restart.
 *
 * MUST be called AFTER `persistProjectDemoState()` for the underlying
 * entity write has succeeded — an audit event must reflect committed
 * state. Calling this helper itself triggers a second persist pass that
 * also captures the new event.
 */
export async function recordAuditEvent(
  request: Request,
  input: RecordAuditEventInput,
): Promise<AuditEvent> {
  const actor = input.actor === undefined ? getCurrentApiUser() : input.actor;
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

  await persistProjectDemoState();
  return event;
}

function cloneSnapshot<T>(value: T): T {
  if (value === null || value === undefined) return value;
  return structuredClone(value);
}
