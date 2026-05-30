/**
 * Agency / brand strings used in headers, sidebars, page titles, and demo
 * copy across the prototype. Sourced from `NEXT_PUBLIC_AGENCY_NAME` (English
 * abbreviation, e.g. `RID`) and `NEXT_PUBLIC_AGENCY_NAME_THAI` (full Thai
 * name, e.g. `กรมชลประทาน`).
 *
 * Both env vars MUST be prefixed `NEXT_PUBLIC_` so they're inlined at build
 * time and available to client components — see Next.js env docs. The
 * defaults below target the current RID demo stakeholder; redeploying for
 * a different agency only requires changing the two env vars.
 *
 * PR-RID-B introduced this helper alongside the seed-data retheme to lift
 * the last NSM-specific strings out of the source tree.
 */

const DEFAULT_AGENCY_NAME = 'RID';
const DEFAULT_AGENCY_NAME_THAI = 'กรมชลประทาน';

export interface AgencyBrand {
  /** Short English abbreviation: e.g. `RID`, `NSM`. */
  name: string;
  /** Full Thai agency name: e.g. `กรมชลประทาน`. */
  nameThai: string;
}

/**
 * Returns the active agency brand. Safe to call from server components,
 * client components, and route handlers — the underlying env vars are
 * `NEXT_PUBLIC_*` so they exist in both runtimes.
 *
 * Treat empty strings as "unset" so a deploy that accidentally exports
 * `NEXT_PUBLIC_AGENCY_NAME=` falls back to the RID default instead of
 * rendering a blank brand chip.
 */
export function getAgencyBrand(): AgencyBrand {
  const name = process.env.NEXT_PUBLIC_AGENCY_NAME?.trim();
  const nameThai = process.env.NEXT_PUBLIC_AGENCY_NAME_THAI?.trim();
  return {
    name: name && name.length > 0 ? name : DEFAULT_AGENCY_NAME,
    nameThai: nameThai && nameThai.length > 0 ? nameThai : DEFAULT_AGENCY_NAME_THAI,
  };
}
