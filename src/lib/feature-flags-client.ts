/**
 * Client-side mirror of the server `FEATURE_RID_PAYMENT_FLOW` flag.
 *
 * The server helper (`src/lib/feature-flags.ts`) reads `process.env[name]`
 * with a dynamic key — Next.js cannot statically inline that into the
 * client bundle, so it only works server-side. Client code (the sidebar
 * nav item) needs a STATIC `process.env.NEXT_PUBLIC_*` reference, which
 * Next.js replaces with the build-time literal.
 *
 * The two flags are independent env vars and MUST be set together for the
 * demo: `FEATURE_RID_PAYMENT_FLOW` (server, gates the API) and
 * `NEXT_PUBLIC_FEATURE_RID_PAYMENT_FLOW` (client, gates the nav item). If
 * they drift, the page degrades gracefully: a public-on/server-off combo
 * surfaces the 503 `FEATURE_DISABLED` notice; public-off/server-on hides
 * the nav item but the direct URL still works.
 *
 * Truthy semantics mirror the server helper exactly: `true | 1 | on`
 * (case-insensitive, trimmed); everything else — including unset and the
 * literal `false` — is OFF.
 */

const TRUTHY_LITERALS: ReadonlySet<string> = new Set(['true', '1', 'on']);

export function isRidPaymentFlowClientEnabled(): boolean {
  const raw = process.env.NEXT_PUBLIC_FEATURE_RID_PAYMENT_FLOW;
  if (raw === undefined || raw === '') return false;
  return TRUTHY_LITERALS.has(raw.trim().toLowerCase());
}
