/**
 * Public a11y surface (PR-A2).
 *
 * Anything outside this module should import from `@/components/a11y`,
 * never reach into the individual files — the internals
 * (`registerLiveRegion`, `unregisterLiveRegion`, the reset helper) are
 * not part of the contract.
 */

export { announce, type AnnounceOptions, type Politeness } from './announcer';
export { LiveRegion } from './LiveRegion';
export { SKIP_LINK_TARGET_ID, SkipLink } from './SkipLink';
