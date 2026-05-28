/**
 * PR-20 — Operator tool: cross-backend parity check.
 *
 * Compares the current InMemory state (rehydrated from JSON seeds +
 * `project-demo-state.ts` if blob storage is configured) against the
 * Database state for every domain. Exits with code 0 if both backends
 * match, code 1 on any drift. Suitable for nightly cron + CI gating
 * during the PR-20 soak window.
 *
 * Usage:
 *   npm run db:parity-check                 # uses pglite if no DATABASE_URL
 *   DATABASE_URL=postgres://... npm run db:parity-check
 *
 * What it does:
 *   1. Build an InMemory registry (seed-hydrated).
 *   2. Build a Database registry (run migrations if needed).
 *   3. For each domain: call `assertParity(in, db)` and log the result.
 *   4. Audit-emit a `dual_write_parity_ok|drift` event per domain.
 *   5. Print a summary + exit non-zero on any drift.
 */

import { getDb } from '@/lib/db/client';
import { runMigrations } from '@/lib/db/migrate';
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
  InMemoryAuditEventRepository,
  InMemoryBoqRepository,
  InMemoryChangeRequestRepository,
  InMemoryDailyReportRepository,
  InMemoryDocumentRepository,
  InMemoryEvmRepository,
  InMemoryGanttRepository,
  InMemoryIssueRepository,
  InMemoryMilestoneRepository,
  InMemoryNotificationRepository,
  InMemoryOrgStructureRepository,
  InMemoryProjectRepository,
  InMemoryQualityGateRepository,
  InMemoryQualityInspectionRepository,
  InMemoryRiskRepository,
  InMemoryTeamMembershipRepository,
  InMemoryUserRepository,
  InMemoryWbsRepository,
} from '@/lib/repositories';
import {
  assertParity,
  recordParityCheck,
  type ParityResult,
} from '@/lib/repositories/dual-write-parity';

interface DomainSpec {
  name: string;
  build: (db: Awaited<ReturnType<typeof getDb>>) => {
    primary: object;
    secondary: object;
  };
}

const DOMAINS: DomainSpec[] = [
  {
    name: 'projects',
    build: (db) => ({
      primary: new InMemoryProjectRepository(),
      secondary: new DatabaseProjectRepository(db),
    }),
  },
  {
    name: 'wbs',
    build: (db) => ({
      primary: new InMemoryWbsRepository(),
      secondary: new DatabaseWbsRepository(db),
    }),
  },
  {
    name: 'boq',
    build: (db) => ({
      primary: new InMemoryBoqRepository(),
      secondary: new DatabaseBoqRepository(db),
    }),
  },
  {
    name: 'milestones',
    build: (db) => ({
      primary: new InMemoryMilestoneRepository(),
      secondary: new DatabaseMilestoneRepository(db),
    }),
  },
  {
    name: 'gantt',
    build: (db) => ({
      primary: new InMemoryGanttRepository(),
      secondary: new DatabaseGanttRepository(db),
    }),
  },
  {
    name: 'dailyReports',
    build: (db) => ({
      primary: new InMemoryDailyReportRepository(),
      secondary: new DatabaseDailyReportRepository(db),
    }),
  },
  {
    name: 'qualityInspections',
    build: (db) => ({
      primary: new InMemoryQualityInspectionRepository(),
      secondary: new DatabaseQualityInspectionRepository(db),
    }),
  },
  {
    name: 'qualityGates',
    build: (db) => ({
      primary: new InMemoryQualityGateRepository(),
      secondary: new DatabaseQualityGateRepository(db),
    }),
  },
  {
    name: 'risks',
    build: (db) => ({
      primary: new InMemoryRiskRepository(),
      secondary: new DatabaseRiskRepository(db),
    }),
  },
  {
    name: 'issues',
    build: (db) => ({
      primary: new InMemoryIssueRepository(),
      secondary: new DatabaseIssueRepository(db),
    }),
  },
  {
    name: 'documents',
    build: (db) => ({
      primary: new InMemoryDocumentRepository(),
      secondary: new DatabaseDocumentRepository(db),
    }),
  },
  {
    name: 'changeRequests',
    build: (db) => ({
      primary: new InMemoryChangeRequestRepository(),
      secondary: new DatabaseChangeRequestRepository(db),
    }),
  },
  {
    name: 'teamMemberships',
    build: (db) => ({
      primary: new InMemoryTeamMembershipRepository(),
      secondary: new DatabaseTeamMembershipRepository(db),
    }),
  },
  {
    name: 'evm',
    build: (db) => ({
      primary: new InMemoryEvmRepository(),
      secondary: new DatabaseEvmRepository(db),
    }),
  },
  {
    name: 'users',
    build: (db) => ({
      primary: new InMemoryUserRepository(),
      secondary: new DatabaseUserRepository(db),
    }),
  },
  {
    name: 'orgStructure',
    build: (db) => ({
      primary: new InMemoryOrgStructureRepository(),
      secondary: new DatabaseOrgStructureRepository(db),
    }),
  },
  {
    name: 'auditEvents',
    build: (db) => ({
      primary: new InMemoryAuditEventRepository(),
      secondary: new DatabaseAuditEventRepository(db),
    }),
  },
  {
    name: 'notifications',
    build: (db) => ({
      primary: new InMemoryNotificationRepository(),
      secondary: new DatabaseNotificationRepository(db),
    }),
  },
];

async function main(): Promise<void> {
  const db = getDb();
  console.log('[parity-check] running migrations (idempotent)...');
  await runMigrations(db);

  const auditRepo = new InMemoryAuditEventRepository();
  const results: Array<{ domain: string; result: ParityResult }> = [];

  for (const spec of DOMAINS) {
    const { primary, secondary } = spec.build(db);
    const result = await assertParity(primary, secondary, { domain: spec.name });
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
