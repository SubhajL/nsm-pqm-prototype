/**
 * PR-30b — External-system integration discovery types.
 *
 * Shared vocabulary for the four out-of-process systems we will
 * eventually adapt (e-GP, GFMIS, PFMS-SP2, PBMS). Each system gets a
 * sibling directory under `src/lib/integrations/` carrying:
 *
 *   - `contract.ts`     Zod schemas describing the wire shape we expect
 *   - `fixtures/*.json` synthetic request / response samples that parse
 *                       cleanly against the schemas (the "sandbox test")
 *   - optional pure helper modules (e.g. linkers, mappers) that bridge
 *     PQM domain entities to the external system's identifiers — never
 *     making any HTTP call themselves.
 *
 * PR-30b ships **discovery only**. No HTTP clients, no API routes, no
 * persistence tables. The actual adapters land post-MVP — see
 * `docs/integrations/POST_MVP_ROADMAP.md`.
 */

export const INTEGRATION_SYSTEMS = [
  'e-gp',
  'gfmis',
  'pfms-sp2',
  'pbms',
] as const;

export type IntegrationSystem = (typeof INTEGRATION_SYSTEMS)[number];

/**
 * Maturity classification per system at PR-30b. Used by the discovery
 * doc and the post-MVP roadmap to express how confident we are in the
 * contract schemas shipped here.
 *
 * - `documented` — public docs / sample files describe the wire format;
 *   fixtures reflect that shape verbatim. Schema is high-confidence.
 * - `inferred`   — no public sample available; schema reflects a
 *   reasonable derivation from related Thai government conventions.
 * - `placeholder` — fixture is a stub; validation conversation must
 *   happen with RID-IT at the demo before we trust the wire format.
 */
export const INTEGRATION_MATURITY = [
  'documented',
  'inferred',
  'placeholder',
] as const;

export type IntegrationMaturity = (typeof INTEGRATION_MATURITY)[number];

/**
 * Tiny manifest record consumed by `integration-manifest.test.ts` to
 * assert every fixture has a corresponding contract module. Authors
 * extend the manifest constant exported below when adding a new
 * fixture.
 */
export interface IntegrationFixtureEntry {
  system: IntegrationSystem;
  /** Path relative to the integration's own directory. */
  fixturePath: string;
  /**
   * Name of the Zod schema (exported from the system's `contract.ts`)
   * that the fixture must satisfy. Asserted at test time.
   */
  schemaExport: string;
  /** Short, human-readable summary for `INTEGRATION_DISCOVERY.md`. */
  description: string;
  maturity: IntegrationMaturity;
}
