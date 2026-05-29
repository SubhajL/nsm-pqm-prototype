/**
 * Operator tool: cross-backend parity check.
 *
 * Post-PR-21 the InMemory backend is no longer the canonical persistence —
 * Database is. This script now compares two Database instances against
 * each other, which is the relevant operator workflow for future
 * blue/green DB migrations (e.g. validating a new Postgres before
 * promoting it).
 *
 * Usage:
 *   npm run db:parity-check    # primary = DATABASE_URL, secondary = DATABASE_URL_SECONDARY
 *
 * Exits with code 0 if both backends match, code 1 on any drift. Each
 * domain comparison emits a `dual_write_parity_ok|drift` audit event so
 * the trend can be tracked over time.
 *
 * If `DATABASE_URL_SECONDARY` is unset, the script reports an error and
 * exits with code 2 (no comparison possible). Operators running this
 * locally for a sanity check can set both URLs to ephemeral pglite by
 * leaving them unset — see the script source for details.
 */

import { drizzle as drizzlePglite } from 'drizzle-orm/pglite';
import { drizzle as drizzlePg } from 'drizzle-orm/postgres-js';
import { PGlite } from '@electric-sql/pglite';
import postgres from 'postgres';

import { runMigrations } from '@/lib/db/migrate';
import type { Db } from '@/lib/db/client';
import * as schema from '@/lib/db/schema';
import {
  DatabaseAuditEventRepository,
  DatabaseBoqRepository,
  DatabaseChangeRequestRepository,
  DatabaseDailyReportRepository,
  DatabaseDocumentRepository,
  DatabaseEvmRepository,
  DatabaseGanttRepository,
  DatabaseIssueRepository,
  DatabaseMilestoneRepository,
  DatabaseNotificationRepository,
  DatabaseOrgStructureRepository,
  DatabaseProjectRepository,
  DatabaseQualityGateRepository,
  DatabaseQualityInspectionRepository,
  DatabaseRiskRepository,
  DatabaseTeamMembershipRepository,
  DatabaseUserRepository,
  DatabaseWbsRepository,
} from '@/lib/db/repositories';
import {
  assertParity,
  recordParityCheck,
  type ParityResult,
} from '@/lib/repositories/dual-write-parity';

interface DomainSpec {
  name: string;
  build: (
    primary: Db,
    secondary: Db,
  ) => { primary: object; secondary: object };
}

const DOMAINS: DomainSpec[] = [
  {
    name: 'projects',
    build: (p, s) => ({
      primary: new DatabaseProjectRepository(p),
      secondary: new DatabaseProjectRepository(s),
    }),
  },
  {
    name: 'wbs',
    build: (p, s) => ({
      primary: new DatabaseWbsRepository(p),
      secondary: new DatabaseWbsRepository(s),
    }),
  },
  {
    name: 'boq',
    build: (p, s) => ({
      primary: new DatabaseBoqRepository(p),
      secondary: new DatabaseBoqRepository(s),
    }),
  },
  {
    name: 'milestones',
    build: (p, s) => ({
      primary: new DatabaseMilestoneRepository(p),
      secondary: new DatabaseMilestoneRepository(s),
    }),
  },
  {
    name: 'gantt',
    build: (p, s) => ({
      primary: new DatabaseGanttRepository(p),
      secondary: new DatabaseGanttRepository(s),
    }),
  },
  {
    name: 'dailyReports',
    build: (p, s) => ({
      primary: new DatabaseDailyReportRepository(p),
      secondary: new DatabaseDailyReportRepository(s),
    }),
  },
  {
    name: 'qualityInspections',
    build: (p, s) => ({
      primary: new DatabaseQualityInspectionRepository(p),
      secondary: new DatabaseQualityInspectionRepository(s),
    }),
  },
  {
    name: 'qualityGates',
    build: (p, s) => ({
      primary: new DatabaseQualityGateRepository(p),
      secondary: new DatabaseQualityGateRepository(s),
    }),
  },
  {
    name: 'risks',
    build: (p, s) => ({
      primary: new DatabaseRiskRepository(p),
      secondary: new DatabaseRiskRepository(s),
    }),
  },
  {
    name: 'issues',
    build: (p, s) => ({
      primary: new DatabaseIssueRepository(p),
      secondary: new DatabaseIssueRepository(s),
    }),
  },
  {
    name: 'documents',
    build: (p, s) => ({
      primary: new DatabaseDocumentRepository(p),
      secondary: new DatabaseDocumentRepository(s),
    }),
  },
  {
    name: 'changeRequests',
    build: (p, s) => ({
      primary: new DatabaseChangeRequestRepository(p),
      secondary: new DatabaseChangeRequestRepository(s),
    }),
  },
  {
    name: 'teamMemberships',
    build: (p, s) => ({
      primary: new DatabaseTeamMembershipRepository(p),
      secondary: new DatabaseTeamMembershipRepository(s),
    }),
  },
  {
    name: 'evm',
    build: (p, s) => ({
      primary: new DatabaseEvmRepository(p),
      secondary: new DatabaseEvmRepository(s),
    }),
  },
  {
    name: 'users',
    build: (p, s) => ({
      primary: new DatabaseUserRepository(p),
      secondary: new DatabaseUserRepository(s),
    }),
  },
  {
    name: 'orgStructure',
    build: (p, s) => ({
      primary: new DatabaseOrgStructureRepository(p),
      secondary: new DatabaseOrgStructureRepository(s),
    }),
  },
  {
    name: 'auditEvents',
    build: (p, s) => ({
      primary: new DatabaseAuditEventRepository(p),
      secondary: new DatabaseAuditEventRepository(s),
    }),
  },
  {
    name: 'notifications',
    build: (p, s) => ({
      primary: new DatabaseNotificationRepository(p),
      secondary: new DatabaseNotificationRepository(s),
    }),
  },
];

function makeDb(url: string | undefined): Db {
  if (url) {
    return drizzlePg(postgres(url), { schema });
  }
  return drizzlePglite(new PGlite(), { schema });
}

async function main(): Promise<void> {
  const primaryUrl = process.env.DATABASE_URL;
  const secondaryUrl = process.env.DATABASE_URL_SECONDARY;

  if (!primaryUrl && !secondaryUrl) {
    console.log(
      '[parity-check] No DATABASE_URL / DATABASE_URL_SECONDARY set — running self-comparison against two ephemeral pglite instances (sanity check only).',
    );
  } else if (!secondaryUrl) {
    console.error(
      '[parity-check] DATABASE_URL_SECONDARY is required to run a real parity check. Set it to the connection string of the OTHER Postgres you want to compare against the primary.',
    );
    process.exit(2);
  }

  const primary = makeDb(primaryUrl);
  const secondary = makeDb(secondaryUrl);
  console.log('[parity-check] running migrations on both backends (idempotent)...');
  await runMigrations(primary);
  await runMigrations(secondary);

  const auditRepo = new DatabaseAuditEventRepository(primary);
  const results: Array<{ domain: string; result: ParityResult }> = [];

  for (const spec of DOMAINS) {
    const { primary: pRepo, secondary: sRepo } = spec.build(primary, secondary);
    const result = await assertParity(pRepo, sRepo, { domain: spec.name });
    results.push({ domain: spec.name, result });
    await recordParityCheck(auditRepo, spec.name, result);
    if (result.parity) {
      console.log(`[parity-check]   OK  ${spec.name} (${result.methodsChecked.join(', ')})`);
    } else {
      console.error(`[parity-check]  DRIFT ${spec.name}`);
      for (const diff of result.differences) {
        console.error(
          `    method=${diff.method} onlyInPrimary=${diff.onlyInPrimary.length} onlyInSecondary=${diff.onlyInSecondary.length} mismatched=${diff.mismatched.length}`,
        );
      }
    }
  }

  const driftCount = results.filter((r) => !r.result.parity).length;
  console.log('');
  console.log(`[parity-check] summary: ${results.length - driftCount}/${results.length} domains OK, ${driftCount} drifted.`);
  if (driftCount > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('[parity-check] FAILED:', err);
  process.exit(1);
});
