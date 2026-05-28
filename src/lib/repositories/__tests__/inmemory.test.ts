/**
 * In-memory repository contract runner.
 *
 * Wires every `runXxxRepositoryContract` against the `InMemoryXxxRepository`
 * impls. The same contracts will be re-run against PR-19's
 * `DatabaseXxxRepository` impls to prove behavioral parity.
 *
 * Each test gets a freshly-seeded in-memory store by resetting the
 * `globalThis.__nsm…` slots that the per-domain stores cache.
 */

import { describe } from 'vitest';

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

/**
 * Wipe the global cache slots so the next `getXxxStore()` call rehydrates
 * from seed. The contracts that mutate state then operate on a clean slate.
 */
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

describe('InMemory repository contracts', () => {
  runProjectRepositoryContract(() => {
    resetAllStoresForTesting();
    return new InMemoryProjectRepository();
  });

  runWbsRepositoryContract(() => {
    resetAllStoresForTesting();
    return new InMemoryWbsRepository();
  });

  runBoqRepositoryContract(() => {
    resetAllStoresForTesting();
    return new InMemoryBoqRepository();
  });

  runMilestoneRepositoryContract(() => {
    resetAllStoresForTesting();
    return new InMemoryMilestoneRepository();
  });

  runGanttRepositoryContract(() => {
    resetAllStoresForTesting();
    return new InMemoryGanttRepository();
  });

  runDailyReportRepositoryContract(() => {
    resetAllStoresForTesting();
    return new InMemoryDailyReportRepository();
  });

  runQualityInspectionRepositoryContract(() => {
    resetAllStoresForTesting();
    return new InMemoryQualityInspectionRepository();
  });

  runQualityGateRepositoryContract(() => {
    resetAllStoresForTesting();
    return new InMemoryQualityGateRepository();
  });

  runRiskRepositoryContract(() => {
    resetAllStoresForTesting();
    return new InMemoryRiskRepository();
  });

  runIssueRepositoryContract(() => {
    resetAllStoresForTesting();
    return new InMemoryIssueRepository();
  });

  runDocumentRepositoryContract(() => {
    resetAllStoresForTesting();
    return new InMemoryDocumentRepository();
  });

  runChangeRequestRepositoryContract(() => {
    resetAllStoresForTesting();
    return new InMemoryChangeRequestRepository();
  });

  runTeamMembershipRepositoryContract(() => {
    resetAllStoresForTesting();
    return new InMemoryTeamMembershipRepository();
  });

  runEvmRepositoryContract(() => {
    resetAllStoresForTesting();
    return new InMemoryEvmRepository();
  });

  runUserRepositoryContract(() => {
    resetAllStoresForTesting();
    return new InMemoryUserRepository();
  });

  runOrgStructureRepositoryContract(() => {
    resetAllStoresForTesting();
    return new InMemoryOrgStructureRepository();
  });

  runAuditEventRepositoryContract(() => {
    resetAllStoresForTesting();
    return new InMemoryAuditEventRepository();
  });

  runNotificationRepositoryContract(() => {
    resetAllStoresForTesting();
    return new InMemoryNotificationRepository();
  });
});
