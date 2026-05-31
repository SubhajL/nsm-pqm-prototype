/**
 * PR-30b — Integration fixture manifest.
 *
 * Single source of truth pairing every fixture JSON on disk with the
 * Zod schema name (exported from the system's `contract.ts`) it must
 * satisfy. `integration-manifest.test.ts` walks this list and the
 * fixtures/ directories to enforce the round-trip.
 */
import type { IntegrationFixtureEntry } from './integration-types';

export const INTEGRATION_FIXTURES: readonly IntegrationFixtureEntry[] = [
  {
    system: 'e-gp',
    fixturePath: 'procurement-reference.sample.json',
    schemaExport: 'egpProcurementReferenceSchema',
    description:
      'Sample e-GP procurement reference notice (synthetic identifiers).',
    maturity: 'documented',
  },
  {
    system: 'e-gp',
    fixturePath: 'award-notice.sample.json',
    schemaExport: 'egpAwardNoticeSchema',
    description:
      'Sample e-GP award notice (ประกาศผู้ชนะ) projection (synthetic).',
    maturity: 'documented',
  },
  {
    system: 'gfmis',
    fixturePath: 'disbursement-record.sample.json',
    schemaExport: 'gfmisDisbursementRecordSchema',
    description: 'Sample GFMIS disbursement document (KhB / KhJ / PY).',
    maturity: 'documented',
  },
  {
    system: 'gfmis',
    fixturePath: 'budget-commitment.sample.json',
    schemaExport: 'gfmisBudgetCommitmentSchema',
    description: 'Sample GFMIS budget commitment record.',
    maturity: 'documented',
  },
  {
    system: 'pfms-sp2',
    fixturePath: 'project-report.stub.json',
    schemaExport: 'pfmsSp2ProjectReportSchema',
    description:
      'STUB — PFMS-SP2 project report; wire format pending RID-IT.',
    maturity: 'placeholder',
  },
  {
    system: 'pbms',
    fixturePath: 'budget-utilisation.stub.json',
    schemaExport: 'pbmsBudgetUtilisationSchema',
    description:
      'STUB — PBMS budget allocation × utilisation snapshot; pending RID-IT.',
    maturity: 'placeholder',
  },
] as const;
