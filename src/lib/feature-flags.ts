/**
 * PR-23 — Feature flag helper.
 *
 * Server-side, env-var driven. Reads `process.env[name]` on every call
 * (no memoisation) and treats the truthy literals `'true' | '1' | 'on'`
 * (case-insensitive) as ON; everything else — including unset, empty
 * string, and the literal `'false'` — as OFF.
 *
 * Use this for any backend flag that needs to flip per environment
 * (e.g. preview vs. production). Routes should gate on the flag BEFORE
 * any auth / DB work, so the 503 envelope is the very first thing a
 * disabled-flag caller sees.
 *
 * Known flags:
 *   - `FEATURE_RID_PAYMENT_FLOW` — PR-23. Gates the work-period +
 *     delivery-slip + committee-inspection + payment-voucher routes.
 */

export type KnownFeatureFlag = 'FEATURE_RID_PAYMENT_FLOW';

const TRUTHY_LITERALS: ReadonlySet<string> = new Set(['true', '1', 'on']);

/**
 * Returns `true` only when `process.env[name]` is set to one of
 * `'true' | '1' | 'on'` (case-insensitive). All other values, including
 * unset, return `false`.
 */
export function isFeatureEnabled(name: KnownFeatureFlag | string): boolean {
  const raw = process.env[name];
  if (raw === undefined || raw === '') return false;
  return TRUTHY_LITERALS.has(raw.trim().toLowerCase());
}

/**
 * Standard 503 envelope for routes gated by a disabled feature flag.
 *
 * The shape mirrors other `error.code` envelopes so clients can rely on
 * a single contract regardless of which ring rejected the request.
 */
export function featureDisabledResponse(name: KnownFeatureFlag | string): Response {
  return Response.json(
    {
      status: 'error',
      error: {
        code: 'FEATURE_DISABLED',
        message: `Feature "${name}" is not enabled in this environment.`,
      },
    },
    { status: 503 },
  );
}
