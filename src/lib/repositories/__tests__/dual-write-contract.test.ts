/**
 * PR-20 — Re-runs PR-18's behavioural contracts against `dualWrite()`-
 * wrapped repositories.
 *
 * Goal: prove the Proxy wrapper preserves CRUD semantics from the
 * consumer's perspective. Each contract is exercised with a wrapper that
 * has:
 *   - primary = freshly-reset InMemoryXxxRepository (read of truth)
 *   - secondary = freshly-migrated DatabaseXxxRepository (write target)
 *
 * Reads are served by primary, so the contracts pass for the same reason
 * they pass against the InMemory impl directly. Writes go to both — if
 * the wrapper accidentally swallowed a primary write, the contracts
 * would fail. If the secondary write threw, the wrapper would silently
 * log + continue (per dual-write spec) and the contract would still pass.
 *
 * This file is the consumer-facing proof that PR-20 is a NON-BREAKING
 * change at the repository-interface level.
 */

import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { describe } from 'vitest';

import type { Db } from '@/lib/db/client';
import { runMigrations } from '@/lib/db/migrate';
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

import { dualWrite } from '../dual-write';
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
} from '../index';

import { runAuditEventRepositoryContract } from './contracts/audit-event.contract';
import { runBoqRepositoryContract } from './contracts/boq.contract';
import { runChangeRequestRepositoryContract } from './contracts/change-request.contract';
import { runDailyReportRepositoryContract } from './contracts/daily-report.contract';
import { runDocumentRepositoryContract } from './contracts/document.contract';
import { runEvmRepositoryContract } from './contracts/evm.contract';
import { runGanttRepositoryContract } from './contracts/gantt.contract';
import { runIssueRepositoryContract } from './contracts/issue.contract';
import { runMilestoneRepositoryContract } from './contracts/milestone.contract';
import { runNotificationRepositoryContract } from './contracts/notification.contract';
import { runOrgStructureRepositoryContract } from './contracts/org-structure.contract';
import { runProjectRepositoryContract } from './contracts/project.contract';
import { runQualityGateRepositoryContract } from './contracts/quality-gate.contract';
import { runQualityInspectionRepositoryContract } from './contracts/quality-inspection.contract';
import { runRiskRepositoryContract } from './contracts/risk.contract';
import { runTeamMembershipRepositoryContract } from './contracts/team-membership.contract';
import { runUserRepositoryContract } from './contracts/user.contract';
import { runWbsRepositoryContract } from './contracts/wbs.contract';

function resetAllStoresForTesting() {
  const globals = globalThis as Record<string, unknown>;
  for (const key of [
    '__nsmProjectStore',
    '__nsmProjectMembershipStore',
    '__nsmMilestoneStore',
    '__nsmWbsStore',
    '__nsmBoqStore',
    '__nsmGanttStore',
    '__nsmDocumentStore',
    '__nsmQualityGateStore',
    '__nsmQualityStore',
    '__nsmRiskStore',
    '__nsmIssueStore',
    '__nsmDailyReportStore',
    '__nsmEvmStore',
    '__nsmEvmProjectRegistry',
    '__nsmChangeRequestStore',
    '__nsmAuditEventStore',
    '__nsmUserStore',
    '__nsmOrgStructureStore',
  ]) {
    globals[key] = undefined;
  }
}

async function freshDb(): Promise<Db> {
  const client = new PGlite();
  const db = drizzle(client, { schema });
  await runMigrations(db);
  return db;
}

/**
 * Seed the synthetic projects used by the WBS / BOQ / etc. contracts so
 * the secondary's FK constraints don't fail. The contracts themselves
 * only inspect their own domain, so adding extra projects is safe.
 */
async function seedSyntheticProjects(db: Db) {
  await db.insert(schema.projects).values(
    ['proj-x', 'proj-a', 'proj-b'].map((id) => ({
      id,
      code: `CODE-${id}`,
      name: id,
      nameEn: id,
      type: 'construction',
      deliveryMethod: 'in_house' as const,
      contractingModel: null,
      sizeTier: 'medium' as const,
      status: 'planning',
      budget: 1,
      progress: 0,
      scheduleHealth: null,
      startDate: '2026-01-01',
      endDate: '2026-12-31',
      duration: 1,
      spiValue: 1,
      cpiValue: 1,
      managerId: 'u',
      managerName: 'u',
      departmentId: 'd',
      departmentName: 'd',
      openIssues: 0,
      highRisks: 0,
      currentMilestone: 0,
      totalMilestones: 0,
      currentLifecycleStage: 'planning' as const,
      lifecycleStageHistory: [],
    })),
  );
}

describe('Dual-write contract (InMemory primary + Database secondary)', () => {
  runProjectRepositoryContract(async () => {
    resetAllStoresForTesting();
    const db = await freshDb();
    return dualWrite(
      new InMemoryProjectRepository(),
      new DatabaseProjectRepository(db),
      { domain: 'projects' },
    );
  });

  runWbsRepositoryContract(async () => {
    resetAllStoresForTesting();
    const db = await freshDb();
    await seedSyntheticProjects(db);
    return dualWrite(
      new InMemoryWbsRepository(),
      new DatabaseWbsRepository(db),
      { domain: 'wbs' },
    );
  });

  runBoqRepositoryContract(async () => {
    resetAllStoresForTesting();
    const db = await freshDb();
    return dualWrite(
      new InMemoryBoqRepository(),
      new DatabaseBoqRepository(db),
      { domain: 'boq' },
    );
  });

  runMilestoneRepositoryContract(async () => {
    resetAllStoresForTesting();
    const db = await freshDb();
    return dualWrite(
      new InMemoryMilestoneRepository(),
      new DatabaseMilestoneRepository(db),
      { domain: 'milestones' },
    );
  });

  runGanttRepositoryContract(async () => {
    resetAllStoresForTesting();
    const db = await freshDb();
    return dualWrite(
      new InMemoryGanttRepository(),
      new DatabaseGanttRepository(db),
      { domain: 'gantt' },
    );
  });

  runDailyReportRepositoryContract(async () => {
    resetAllStoresForTesting();
    const db = await freshDb();
    return dualWrite(
      new InMemoryDailyReportRepository(),
      new DatabaseDailyReportRepository(db),
      { domain: 'dailyReports' },
    );
  });

  runQualityInspectionRepositoryContract(async () => {
    resetAllStoresForTesting();
    const db = await freshDb();
    return dualWrite(
      new InMemoryQualityInspectionRepository(),
      new DatabaseQualityInspectionRepository(db),
      { domain: 'qualityInspections' },
    );
  });

  runQualityGateRepositoryContract(async () => {
    resetAllStoresForTesting();
    const db = await freshDb();
    return dualWrite(
      new InMemoryQualityGateRepository(),
      new DatabaseQualityGateRepository(db),
      { domain: 'qualityGates' },
    );
  });

  runRiskRepositoryContract(async () => {
    resetAllStoresForTesting();
    const db = await freshDb();
    return dualWrite(
      new InMemoryRiskRepository(),
      new DatabaseRiskRepository(db),
      { domain: 'risks' },
    );
  });

  runIssueRepositoryContract(async () => {
    resetAllStoresForTesting();
    const db = await freshDb();
    return dualWrite(
      new InMemoryIssueRepository(),
      new DatabaseIssueRepository(db),
      { domain: 'issues' },
    );
  });

  runDocumentRepositoryContract(async () => {
    resetAllStoresForTesting();
    const db = await freshDb();
    return dualWrite(
      new InMemoryDocumentRepository(),
      new DatabaseDocumentRepository(db),
      { domain: 'documents' },
    );
  });

  runChangeRequestRepositoryContract(async () => {
    resetAllStoresForTesting();
    const db = await freshDb();
    return dualWrite(
      new InMemoryChangeRequestRepository(),
      new DatabaseChangeRequestRepository(db),
      { domain: 'changeRequests' },
    );
  });

  runTeamMembershipRepositoryContract(async () => {
    resetAllStoresForTesting();
    const db = await freshDb();
    return dualWrite(
      new InMemoryTeamMembershipRepository(),
      new DatabaseTeamMembershipRepository(db),
      { domain: 'teamMemberships' },
    );
  });

  runEvmRepositoryContract(async () => {
    resetAllStoresForTesting();
    const db = await freshDb();
    return dualWrite(
      new InMemoryEvmRepository(),
      new DatabaseEvmRepository(db),
      { domain: 'evm' },
    );
  });

  runUserRepositoryContract(async () => {
    resetAllStoresForTesting();
    const db = await freshDb();
    return dualWrite(
      new InMemoryUserRepository(),
      new DatabaseUserRepository(db),
      { domain: 'users' },
    );
  });

  runOrgStructureRepositoryContract(async () => {
    resetAllStoresForTesting();
    const db = await freshDb();
    return dualWrite(
      new InMemoryOrgStructureRepository(),
      new DatabaseOrgStructureRepository(db),
      { domain: 'orgStructure' },
    );
  });

  runAuditEventRepositoryContract(async () => {
    resetAllStoresForTesting();
    const db = await freshDb();
    return dualWrite(
      new InMemoryAuditEventRepository(),
      new DatabaseAuditEventRepository(db),
      { domain: 'auditEvents' },
    );
  });

  runNotificationRepositoryContract(async () => {
    resetAllStoresForTesting();
    const db = await freshDb();
    return dualWrite(
      new InMemoryNotificationRepository(),
      new DatabaseNotificationRepository(db),
      { domain: 'notifications' },
    );
  });
});
