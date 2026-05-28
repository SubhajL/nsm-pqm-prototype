/**
 * PR-20 — Dual-write repository wrapper.
 *
 * Wraps a primary (read-of-truth) + secondary (write-only) repository pair.
 * Every write calls BOTH; reads come from the PRIMARY only.
 * Secondary write failures are logged + audit-emitted but do NOT throw —
 * the primary stays authoritative until the PR-21 cutover.
 *
 * Per MVP plan PR-20: enables a soak window where Database writes are
 * validated against InMemory state without risking demo behaviour. PR-21
 * will flip reads to Database and retire InMemory.
 *
 * Implementation:
 *   - Proxy-based so we don't have to write 18 hand-written delegators.
 *   - Read vs write classification is by method name prefix (see WRITE_RX
 *     below). This intentionally errs on the side of "duplicate the call"
 *     for any method whose name starts with a mutating verb — repositories
 *     that expose unusual write methods (e.g. `lockVersion`) are listed
 *     in `EXTRA_WRITE_METHODS` so they are duplicated too.
 *   - Method names that are explicitly *read-only* but happen to start with
 *     a mutating verb (none today) would be listed in `EXTRA_READ_METHODS`.
 *   - For methods that the secondary doesn't implement (shouldn't happen in
 *     practice — primary + secondary are equivalent impls of the same
 *     interface) we silently skip the secondary call.
 */

import type { AuditEventRepository } from './audit-event.repository';

/**
 * Verbs that mark a method as a write. The match is case-insensitive and
 * applies at the START of the method name only — so `update`, `updateMany`,
 * `createXxx`, `deleteYyy` all qualify, but `getUpdate` does not.
 */
const WRITE_RX = /^(create|update|delete|append|insert|upsert|patch|set|push|add|remove|mark|upload|ensure)/i;

/**
 * Domain-specific write methods whose names don't match WRITE_RX.
 * Listed here so the Proxy treats them as writes.
 */
const EXTRA_WRITE_METHODS = new Set<string>([
  'lockVersion', // documents
]);

/**
 * Read methods whose names happen to match WRITE_RX but which should NOT
 * be duplicated to the secondary. Empty today; defensive insurance for the
 * future.
 */
const EXTRA_READ_METHODS = new Set<string>([]);

export interface DualWriteOptions {
  /** Used in log lines + audit `resourceType` discriminator. */
  domain: string;
  /**
   * Optional audit-event repository for recording secondary write failures.
   * If omitted (e.g. when wrapping the audit repository itself, to avoid
   * recursion), failures are logged but not audit-recorded.
   */
  auditRepo?: AuditEventRepository;
}

function isWriteMethod(name: string): boolean {
  if (EXTRA_READ_METHODS.has(name)) return false;
  if (EXTRA_WRITE_METHODS.has(name)) return true;
  return WRITE_RX.test(name);
}

/**
 * Build a Proxy that delegates reads to `primary` and writes to BOTH.
 *
 * Secondary call timing: kicked off AFTER `await`-ing the primary so the
 * caller observes primary's result (and any thrown error from the primary
 * surfaces normally). The secondary is then `await`-ed so a slow DB write
 * still backpressures the caller — this is intentional: we want the soak
 * window to surface real timing differences. If the secondary throws, the
 * error is swallowed and routed to logging + audit; the primary result is
 * still returned.
 */
export function dualWrite<T extends object>(
  primary: T,
  secondary: T,
  options: DualWriteOptions,
): T {
  return new Proxy(primary, {
    get(target, prop, receiver) {
      const value = Reflect.get(target, prop, receiver);
      if (typeof value !== 'function') return value;
      if (typeof prop === 'symbol') {
        return (value as (...a: unknown[]) => unknown).bind(target);
      }

      const methodName = String(prop);
      const write = isWriteMethod(methodName);

      return async (...args: unknown[]) => {
        const primaryResult = await (value as (...a: unknown[]) => unknown).apply(target, args);
        if (!write) return primaryResult;

        const secondaryMethod = (secondary as unknown as Record<string, unknown>)[methodName];
        if (typeof secondaryMethod !== 'function') return primaryResult;

        try {
          await (secondaryMethod as (...a: unknown[]) => unknown).apply(secondary, args);
        } catch (err) {
          // Best-effort logging + audit. NEVER throw — that would defeat the
          // dual-write soak's "primary stays authoritative" guarantee.
          console.error(
            `[dual-write:${options.domain}] secondary ${methodName} failed`,
            err,
          );
          if (options.auditRepo) {
            recordSecondaryWriteFailure(
              options.auditRepo,
              options.domain,
              methodName,
              args,
              err,
            ).catch((auditErr) => {
              // If even the audit emission fails, log and move on. Don't
              // recurse, don't throw.
              console.error(
                `[dual-write:${options.domain}] audit emission for secondary failure ALSO failed`,
                auditErr,
              );
            });
          }
        }

        return primaryResult;
      };
    },
  }) as T;
}

/**
 * Record a `dual_write_secondary_failed` audit event via the PRIMARY audit
 * repository. The audit repo passed here is the registry's primary
 * (InMemory) — so the audit trail is durable even when the Database is
 * unreachable.
 *
 * Exposed for test introspection (so a fake audit repo can capture the
 * shape) but not part of the public API surface.
 */
export async function recordSecondaryWriteFailure(
  auditRepo: AuditEventRepository,
  domain: string,
  methodName: string,
  args: unknown[],
  err: unknown,
): Promise<void> {
  const errorMessage = err instanceof Error ? err.message : String(err);
  const errorName = err instanceof Error ? err.name : 'UnknownError';
  await auditRepo.append({
    requestId: 'system:dual-write',
    actorId: null,
    actorRole: null,
    action: 'dual_write_secondary_failed',
    resourceType: 'persistence_backend',
    resourceId: `${domain}:${methodName}`,
    projectId: null,
    before: null,
    after: {
      domain,
      method: methodName,
      argCount: args.length,
      errorName,
      errorMessage,
    },
    decisionReason: 'Secondary backend write failed; primary remains authoritative.',
    authorityBasis: 'MVP_PLAN:PR-20:dual-write-soak',
    ipAddress: null,
    userAgent: null,
  });
}
