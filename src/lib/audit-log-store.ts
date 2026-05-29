import seedAuditLogs from '@/data/audit-logs.json';
import type { AuditEvent } from '@/types/audit';
import type { UserRole } from '@/types/admin';

/**
 * Append-only audit event store (PR-05).
 *
 * Each successful write mutation in the system emits exactly one
 * `AuditEvent` via `appendAuditEvent`. The store is INSERTION-ORDERED and
 * APPEND-ONLY — there is no exported mutator that can update or remove a
 * past event. Tests rely on this invariant; do NOT add an
 * `updateAuditEvent`/`removeAuditEvent` helper.
 *
 * LEGACY MIGRATION:
 * The earlier text-record `AuditLog` shape (`id`, `userId`, `userName`,
 * `ip`, `os`, `module`, `action`, `timestamp`) is still present in the
 * seed fixture (`src/data/audit-logs.json`) and any previously-persisted
 * blob snapshot from before PR-05. On hydration we one-shot convert those
 * records to `AuditEvent` with:
 *   - `requestId`     = `'legacy'`
 *   - `actorId`       = original `userId` (or null if `'system'`)
 *   - `actorRole`     = null (legacy records don't carry role at-time-of-action)
 *   - `action`        = original `action` text (Thai, kept verbatim for the
 *                       audit trail)
 *   - `resourceType`  = lowercased `module`
 *   - `resourceId`    = `userId` (best-effort — legacy records don't have a
 *                       structured resource id)
 *   - `projectId`     = null
 *   - `before/after`  = null (lossy — legacy records had no snapshot)
 *   - `decisionReason`/`authorityBasis` = null
 *   - `ipAddress`     = original `ip`
 *   - `userAgent`     = original `os`
 *
 * Once the persisted snapshot rolls over to the new shape, the migration
 * is a no-op on subsequent boots.
 */

interface LegacyAuditLog {
  id: string;
  userId: string;
  userName: string;
  ip: string;
  os: string;
  module: string;
  action: string;
  timestamp: string;
}

interface AppendAuditEventOptions {
  /**
   * Optional override for `id`/`timestamp`. Used by snapshot
   * restoration (`applyProjectDemoStateSnapshot`) so that re-hydrated
   * events keep their original identity. Normal callers should omit
   * these — the helper auto-assigns.
   */
  id?: string;
  timestamp?: string;
}

declare global {
  // eslint-disable-next-line no-var
  var __nsmAuditEventStore: AuditEvent[] | undefined;
}

function isLegacyAuditLog(entry: unknown): entry is LegacyAuditLog {
  if (!entry || typeof entry !== 'object') return false;
  const record = entry as Record<string, unknown>;
  return (
    typeof record.id === 'string' &&
    typeof record.userId === 'string' &&
    typeof record.module === 'string' &&
    typeof record.action === 'string' &&
    typeof record.timestamp === 'string' &&
    // distinguishing fields absent on AuditEvent:
    typeof record.userName === 'string' &&
    typeof record.os === 'string'
  );
}

function isAuditEvent(entry: unknown): entry is AuditEvent {
  if (!entry || typeof entry !== 'object') return false;
  const record = entry as Record<string, unknown>;
  return (
    typeof record.id === 'string' &&
    typeof record.timestamp === 'string' &&
    typeof record.requestId === 'string' &&
    typeof record.action === 'string' &&
    typeof record.resourceType === 'string' &&
    typeof record.resourceId === 'string'
  );
}

function migrateLegacyAuditLog(legacy: LegacyAuditLog): AuditEvent {
  return {
    id: legacy.id,
    timestamp: legacy.timestamp,
    requestId: 'legacy',
    actorId: legacy.userId === 'system' ? null : legacy.userId,
    actorRole: null,
    action: legacy.action,
    resourceType: legacy.module.toLowerCase(),
    resourceId: legacy.userId,
    projectId: null,
    before: null,
    after: null,
    decisionReason: null,
    authorityBasis: null,
    ipAddress: legacy.ip || null,
    userAgent: legacy.os || null,
  };
}

function seedAuditEvents(): AuditEvent[] {
  const seed = seedAuditLogs as unknown[];
  return seed.map((entry) => {
    if (isAuditEvent(entry)) return entry;
    if (isLegacyAuditLog(entry)) return migrateLegacyAuditLog(entry);

    // Unknown shape — surface as a degraded event so we never silently drop
    // audit history.
    const fallback = entry as Record<string, unknown>;
    return {
      id: typeof fallback.id === 'string' ? fallback.id : `evt-${crypto.randomUUID()}`,
      timestamp:
        typeof fallback.timestamp === 'string' ? fallback.timestamp : new Date(0).toISOString(),
      requestId: 'legacy',
      actorId: null,
      actorRole: null,
      action: typeof fallback.action === 'string' ? fallback.action : 'unknown',
      resourceType: 'unknown',
      resourceId: typeof fallback.id === 'string' ? fallback.id : 'unknown',
      projectId: null,
      before: null,
      after: null,
      decisionReason: null,
      authorityBasis: null,
      ipAddress: null,
      userAgent: null,
    };
  });
}

export function getAuditEventStore(): AuditEvent[] {
  if (!globalThis.__nsmAuditEventStore) {
    globalThis.__nsmAuditEventStore = seedAuditEvents();
  }

  return globalThis.__nsmAuditEventStore;
}

/**
 * Append a new audit event to the store.
 *
 * Returns the persisted event so callers can use the auto-assigned id
 * and timestamp.
 *
 * NOTE: This is the ONLY supported way to add to the store. There is
 * intentionally no update/delete helper.
 */
export function appendAuditEvent(
  event: Omit<AuditEvent, 'id' | 'timestamp'> & Partial<Pick<AuditEvent, 'id' | 'timestamp'>>,
  options: AppendAuditEventOptions = {},
): AuditEvent {
  const store = getAuditEventStore();

  const persisted: AuditEvent = {
    id: options.id ?? event.id ?? `evt-${crypto.randomUUID()}`,
    timestamp: options.timestamp ?? event.timestamp ?? new Date().toISOString(),
    requestId: event.requestId,
    actorId: event.actorId,
    actorRole: event.actorRole,
    action: event.action,
    resourceType: event.resourceType,
    resourceId: event.resourceId,
    projectId: event.projectId,
    before: event.before,
    after: event.after,
    decisionReason: event.decisionReason,
    authorityBasis: event.authorityBasis,
    ipAddress: event.ipAddress,
    userAgent: event.userAgent,
  };

  store.push(persisted);
  return persisted;
}

// ---------------------------------------------------------------------------
// Re-exports for legacy call-sites.
//
// `getAuditLogStore` is preserved so any remaining external code keeps
// working until callers migrate to `getAuditEventStore`. The return type
// is widened to `AuditEvent[]` — callers that expected the old `AuditLog`
// shape now see structured events instead.
// ---------------------------------------------------------------------------

export const getAuditLogStore = getAuditEventStore;

/**
 * Test-only helper: reset the store to its seeded (post-migration) state.
 * Production code MUST NOT call this — the store is append-only.
 *
 * @internal
 */
export function __resetAuditEventStoreForTests(): void {
  globalThis.__nsmAuditEventStore = seedAuditEvents();
}

/**
 * @deprecated PR-05 replaced text-record `appendAuditLog` with the
 * structured `appendAuditEvent`. This shim remains for legacy admin
 * routes that haven't migrated yet — it constructs an `AuditEvent` with
 * the same loose semantics as a legacy record (no requestId, no
 * before/after, no role snapshot). New code MUST use `appendAuditEvent`
 * via `recordAuditEvent` in `src/lib/audit-helpers.ts`.
 */
export function appendAuditLog(
  user: { id: string; name: string; role?: UserRole } | null,
  module: string,
  action: string,
): AuditEvent {
  return appendAuditEvent({
    requestId: 'legacy',
    actorId: user?.id ?? null,
    actorRole: user?.role ?? null,
    action,
    resourceType: module.toLowerCase(),
    resourceId: user?.id ?? 'system',
    projectId: null,
    before: null,
    after: null,
    decisionReason: null,
    authorityBasis: null,
    ipAddress: null,
    userAgent: null,
  });
}
