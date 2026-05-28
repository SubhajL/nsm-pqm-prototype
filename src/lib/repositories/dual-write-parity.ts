/**
 * PR-20 — Cross-backend parity assertion.
 *
 * Compares the state of a primary and secondary repository pair (typically
 * InMemoryXxx + DatabaseXxx during a dual-write soak) by listing every
 * collection-style read method exposed by both and deep-comparing the
 * resulting arrays.
 *
 * Used by:
 *   - `dual-write-parity.test.ts` — unit-level proof that drift is detected.
 *   - `scripts/db-parity-check.ts` (npm run db:parity-check) — operator
 *     tool for confirming clean soak before PR-21 cutover.
 *
 * The function is intentionally backend-agnostic. It introspects the
 * primary's prototype + own properties for methods whose names start with
 * `list` or `all` (or are exactly `getData` / `registeredProjectIds`) and
 * calls them with zero arguments. Methods that require arguments
 * (`listByProject`, `findById`, `getDataForProject`, `lockVersion`, etc)
 * are skipped — parity at the per-project / per-entity level is covered by
 * the contract tests; this function targets the GLOBAL collection drift
 * detection that matters for the soak window.
 */

import type { AuditEventRepository } from './audit-event.repository';

export interface ParityDifference {
  /** Method name that was compared. */
  method: string;
  /** Items present in primary but missing from secondary. */
  onlyInPrimary: unknown[];
  /** Items present in secondary but missing from primary. */
  onlyInSecondary: unknown[];
  /** Pairs whose ids match but field-level contents differ. */
  mismatched: Array<{ id: unknown; primary: unknown; secondary: unknown }>;
}

export type ParityResult =
  | { parity: true; methodsChecked: string[] }
  | { parity: false; differences: ParityDifference[]; methodsChecked: string[] };

export interface AssertParityOptions {
  domain: string;
  /**
   * Override the discovered method list. Useful for tests + for repos
   * whose read surface uses bespoke names (e.g. `allByProject`).
   */
  methods?: string[];
}

const DEFAULT_ZERO_ARG_READERS = new Set([
  'list',
  'all',
  'allByProject',
  'getData',
  'registeredProjectIds',
  'listInspections',
  'listItpItems',
]);

function discoverReadMethods<T extends object>(repo: T): string[] {
  const proto = Object.getPrototypeOf(repo) as object | null;
  const own = Object.getOwnPropertyNames(repo);
  const protoNames = proto ? Object.getOwnPropertyNames(proto) : [];
  const allNames = Array.from(new Set<string>([...own, ...protoNames]));
  const out: string[] = [];
  for (const name of allNames) {
    if (name === 'constructor') continue;
    if (!DEFAULT_ZERO_ARG_READERS.has(name)) continue;
    const fn = (repo as unknown as Record<string, unknown>)[name];
    if (typeof fn === 'function' && (fn as (...a: unknown[]) => unknown).length === 0) {
      out.push(name);
    }
  }
  return out.sort();
}

/**
 * Stable, order-independent identity for an entity returned by a read.
 * Most repos return objects with an `id` field; collections returned as
 * `Record<projectId, blob>` are flattened to `[key, blob]` pairs.
 */
function identityOf(item: unknown): string {
  if (item && typeof item === 'object') {
    const obj = item as Record<string, unknown>;
    if (typeof obj.id === 'string') return `id:${obj.id}`;
    if (typeof obj.id === 'number') return `id:${obj.id}`;
    if (
      typeof obj.projectId === 'string' &&
      typeof obj.userId === 'string'
    ) {
      return `pj:${obj.projectId}|u:${obj.userId}`;
    }
    if (
      typeof obj.projectId === 'string' &&
      typeof obj.month === 'string'
    ) {
      return `pj:${obj.projectId}|m:${obj.month}`;
    }
  }
  return `raw:${JSON.stringify(item)}`;
}

/**
 * Deep-equal with two parity-specific tolerances:
 *   1. `undefined` and a missing key are treated as equivalent (the DB
 *      round-trip materializes optional fields as explicit `undefined`,
 *      whereas the in-memory shape simply omits the key).
 *   2. `undefined` and `null` are also treated as equivalent (some Drizzle
 *      mappings convert SQL NULLs to `undefined` and others to `null`).
 *
 * These tolerances are SAFE for parity assertions because the goal is to
 * detect divergence in stored state, not to enforce strict structural
 * identity of the in-memory representations.
 */
function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a === undefined || a === null) return b === undefined || b === null;
  if (b === undefined || b === null) return a === undefined || a === null;
  if (typeof a !== 'object' || typeof b !== 'object') return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  if (Array.isArray(a)) {
    const arrA = a as unknown[];
    const arrB = b as unknown[];
    if (arrA.length !== arrB.length) return false;
    for (let i = 0; i < arrA.length; i++) {
      if (!deepEqual(arrA[i], arrB[i])) return false;
    }
    return true;
  }
  const objA = a as Record<string, unknown>;
  const objB = b as Record<string, unknown>;
  const allKeys = Array.from(new Set<string>([...Object.keys(objA), ...Object.keys(objB)]));
  for (const k of allKeys) {
    if (!deepEqual(objA[k], objB[k])) return false;
  }
  return true;
}

function normalizeToArray(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  if (value && typeof value === 'object') {
    // Record<key, blob> → [key, blob] pairs for parity purposes.
    return Object.entries(value as Record<string, unknown>).map(([key, val]) => ({
      id: key,
      ...((val && typeof val === 'object') ? (val as Record<string, unknown>) : { value: val }),
    }));
  }
  return [value];
}

function diff(method: string, primaryItems: unknown[], secondaryItems: unknown[]): ParityDifference | null {
  const primaryById = new Map<string, unknown>();
  const secondaryById = new Map<string, unknown>();
  for (const item of primaryItems) primaryById.set(identityOf(item), item);
  for (const item of secondaryItems) secondaryById.set(identityOf(item), item);

  const onlyInPrimary: unknown[] = [];
  const onlyInSecondary: unknown[] = [];
  const mismatched: Array<{ id: unknown; primary: unknown; secondary: unknown }> = [];

  primaryById.forEach((pItem, id) => {
    const sItem = secondaryById.get(id);
    if (sItem === undefined) {
      onlyInPrimary.push(pItem);
    } else if (!deepEqual(pItem, sItem)) {
      mismatched.push({ id, primary: pItem, secondary: sItem });
    }
  });
  secondaryById.forEach((sItem, id) => {
    if (!primaryById.has(id)) onlyInSecondary.push(sItem);
  });

  if (
    onlyInPrimary.length === 0 &&
    onlyInSecondary.length === 0 &&
    mismatched.length === 0
  ) {
    return null;
  }
  return { method, onlyInPrimary, onlyInSecondary, mismatched };
}

export async function assertParity<T extends object>(
  primary: T,
  secondary: T,
  options: AssertParityOptions,
): Promise<ParityResult> {
  const methods = options.methods ?? discoverReadMethods(primary);
  const differences: ParityDifference[] = [];

  for (const method of methods) {
    const primaryFn = (primary as unknown as Record<string, unknown>)[method];
    const secondaryFn = (secondary as unknown as Record<string, unknown>)[method];
    if (typeof primaryFn !== 'function' || typeof secondaryFn !== 'function') continue;

    const [pRaw, sRaw] = await Promise.all([
      (primaryFn as () => Promise<unknown>).call(primary),
      (secondaryFn as () => Promise<unknown>).call(secondary),
    ]);

    const d = diff(method, normalizeToArray(pRaw), normalizeToArray(sRaw));
    if (d) differences.push(d);
  }

  if (differences.length === 0) {
    return { parity: true, methodsChecked: methods };
  }
  return { parity: false, differences, methodsChecked: methods };
}

/**
 * Emit one audit event summarising the parity result. Used by the
 * `db:parity-check` script so operators can correlate runs across time.
 *
 * Note: the audit event is recorded via the supplied repo regardless of
 * parity outcome — we want a trail of "we checked, here's what we found",
 * not just failures.
 */
export async function recordParityCheck(
  auditRepo: AuditEventRepository,
  domain: string,
  result: ParityResult,
): Promise<void> {
  await auditRepo.append({
    requestId: 'system:parity-check',
    actorId: null,
    actorRole: null,
    action: result.parity ? 'dual_write_parity_ok' : 'dual_write_parity_drift',
    resourceType: 'persistence_backend',
    resourceId: domain,
    projectId: null,
    before: null,
    after: result.parity
      ? { methodsChecked: result.methodsChecked }
      : {
          methodsChecked: result.methodsChecked,
          driftSummary: result.differences.map((d) => ({
            method: d.method,
            onlyInPrimary: d.onlyInPrimary.length,
            onlyInSecondary: d.onlyInSecondary.length,
            mismatched: d.mismatched.length,
          })),
        },
    decisionReason: result.parity
      ? 'Primary + secondary backends match across all checked collections.'
      : 'Primary + secondary backends diverged — investigate before PR-21 cutover.',
    authorityBasis: 'MVP_PLAN:PR-20:dual-write-soak',
    ipAddress: null,
    userAgent: null,
  });
}
