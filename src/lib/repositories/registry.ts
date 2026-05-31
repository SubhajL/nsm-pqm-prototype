/**
 * Repository registry. PR-21b cutover complete.
 *
 * Single composition root. All API routes call `getRepositories().<domain>`
 * to reach persistence — they never touch raw stores directly.
 *
 * Behaviour by `PERSISTENCE_BACKEND` env var (read once on first call):
 *
 *   - undefined | 'db' | 'dual' → DatabaseXxxRepository everywhere. Postgres
 *                                  is the canonical persistence. `'dual'` is
 *                                  retained as a no-op alias for `'db'` so
 *                                  existing deployments with the env var
 *                                  already set keep working after PR-21b.
 *   - 'in_memory'              → REJECTED. The InMemory layer was retired in
 *                                  PR-21b. Operators who need an ephemeral
 *                                  store can run without `DATABASE_URL` to
 *                                  get an in-process pglite — Database repos
 *                                  on top of that behave like InMemory.
 *   - any other value          → console.warn + fall back to 'db'.
 *
 * On first call the registry kicks off `ensureDatabaseSeeded(db)` which
 * runs schema migrations and idempotently loads the fixture + generated
 * scenario seed data. The returned Database repos are wrapped in a Proxy
 * that awaits this readiness promise before invoking any method — so
 * routes never observe an unmigrated DB.
 *
 * Test hooks (`__setRepositoriesForTesting` / `__resetRepositoriesForTesting`)
 * let suites inject fakes for unit tests without monkey-patching the
 * underlying DB. Production code MUST NOT call these.
 */

import { ensureDatabaseSeeded } from '@/lib/db/bootstrap';
import { createDbClient, type Db } from '@/lib/db/client';
import {
  DatabaseAuditEventRepository,
  DatabaseAwardedContractRepository,
  DatabaseBoqRepository,
  DatabaseChangeRequestRepository,
  DatabaseContractAmendmentRepository,
  DatabaseContractorPrequalificationRepository,
  DatabaseDailyReportRepository,
  DatabaseDocumentRepository,
  DatabaseEngineeringEstimateRepository,
  DatabaseEnvironmentalAssessmentRepository,
  DatabaseEvmRepository,
  DatabaseGanttRepository,
  DatabaseIssueRepository,
  DatabaseLandAcquisitionRepository,
  DatabaseMilestoneRepository,
  DatabaseNotificationRepository,
  DatabaseOrgStructureRepository,
  DatabasePermitRepository,
  DatabaseProcurementPackageRepository,
  DatabaseProjectApprovalRequestRepository,
  DatabaseProjectRepository,
  DatabasePublicHearingRepository,
  DatabaseQualityGateRepository,
  DatabaseQualityInspectionRepository,
  DatabaseRiskRepository,
  DatabaseTeamMembershipRepository,
  DatabaseTorDocumentRepository,
  DatabaseUserRepository,
  DatabaseWbsRepository,
} from '@/lib/db/repositories';

import type { AuditEventRepository } from './audit-event.repository';
import type { AwardedContractRepository } from './awarded-contract.repository';
import type { BoqRepository } from './boq.repository';
import type { ChangeRequestRepository } from './change-request.repository';
import type { ContractAmendmentRepository } from './contract-amendment.repository';
import type { ContractorPrequalificationRepository } from './contractor-prequalification.repository';
import type { DailyReportRepository } from './daily-report.repository';
import type { DocumentRepository } from './document.repository';
import type { EngineeringEstimateRepository } from './engineering-estimate.repository';
import type { EnvironmentalAssessmentRepository } from './environmental-assessment.repository';
import type { EvmRepository } from './evm.repository';
import type { GanttRepository } from './gantt.repository';
import type { IssueRepository } from './issue.repository';
import type { LandAcquisitionRepository } from './land-acquisition.repository';
import type { MilestoneRepository } from './milestone.repository';
import type { NotificationRepository } from './notification.repository';
import type { OrgStructureRepository } from './org-structure.repository';
import type { PermitRepository } from './permit.repository';
import type { ProcurementPackageRepository } from './procurement-package.repository';
import type { ProjectApprovalRequestRepository } from './project-approval-request.repository';
import type { ProjectRepository } from './project.repository';
import type { PublicHearingRepository } from './public-hearing.repository';
import type { QualityGateRepository } from './quality-gate.repository';
import type { QualityInspectionRepository } from './quality-inspection.repository';
import type { RiskRepository } from './risk.repository';
import type { TeamMembershipRepository } from './team-membership.repository';
import type { TorDocumentRepository } from './tor-document.repository';
import type { UserRepository } from './user.repository';
import type { WbsRepository } from './wbs.repository';

export interface RepositoryRegistry {
  auditEvents: AuditEventRepository;
  awardedContracts: AwardedContractRepository;
  boq: BoqRepository;
  changeRequests: ChangeRequestRepository;
  contractAmendments: ContractAmendmentRepository;
  contractorPrequalifications: ContractorPrequalificationRepository;
  dailyReports: DailyReportRepository;
  documents: DocumentRepository;
  engineeringEstimates: EngineeringEstimateRepository;
  environmentalAssessments: EnvironmentalAssessmentRepository;
  evm: EvmRepository;
  gantt: GanttRepository;
  issues: IssueRepository;
  landAcquisitionRecords: LandAcquisitionRepository;
  milestones: MilestoneRepository;
  notifications: NotificationRepository;
  orgStructure: OrgStructureRepository;
  permits: PermitRepository;
  procurementPackages: ProcurementPackageRepository;
  projectApprovalRequests: ProjectApprovalRequestRepository;
  projects: ProjectRepository;
  publicHearings: PublicHearingRepository;
  qualityGates: QualityGateRepository;
  qualityInspections: QualityInspectionRepository;
  risks: RiskRepository;
  teamMemberships: TeamMembershipRepository;
  torDocuments: TorDocumentRepository;
  users: UserRepository;
  wbs: WbsRepository;
}

/**
 * Accepted PERSISTENCE_BACKEND values.
 *   - 'db' (default) — Postgres-backed.
 *   - 'dual' — alias for 'db' (no-op back-compat with operators who set
 *     the env var during the PR-20 soak; the InMemory backend is gone).
 *
 * Operator note: 'in_memory' is no longer accepted; passing it logs a
 * warning and falls through to 'db'. This is intentional — PR-21b
 * deleted the InMemory layer.
 */
export type PersistenceBackend = 'db' | 'dual';

/**
 * Build a Database-backed registry where every method is gated on
 * `ensureDatabaseSeeded(db)`. This lets `getRepositories()` stay
 * synchronous while still guaranteeing schema + seed are in place
 * before the first repo call returns data.
 */
function createDatabaseRegistry(db: Db): RepositoryRegistry {
  const ready = ensureDatabaseSeeded(db);

  const wrap = <T extends object>(repo: T): T => {
    return new Proxy(repo, {
      get(target, prop, receiver) {
        const value = Reflect.get(target, prop, receiver);
        if (typeof value !== 'function') return value;
        if (typeof prop === 'symbol') {
          return (value as (...a: unknown[]) => unknown).bind(target);
        }
        return async (...args: unknown[]) => {
          await ready;
          return (value as (...a: unknown[]) => unknown).apply(target, args);
        };
      },
    }) as T;
  };

  return {
    auditEvents: wrap(new DatabaseAuditEventRepository(db)),
    awardedContracts: wrap(new DatabaseAwardedContractRepository(db)),
    boq: wrap(new DatabaseBoqRepository(db)),
    changeRequests: wrap(new DatabaseChangeRequestRepository(db)),
    contractAmendments: wrap(new DatabaseContractAmendmentRepository(db)),
    contractorPrequalifications: wrap(
      new DatabaseContractorPrequalificationRepository(db),
    ),
    dailyReports: wrap(new DatabaseDailyReportRepository(db)),
    documents: wrap(new DatabaseDocumentRepository(db)),
    engineeringEstimates: wrap(new DatabaseEngineeringEstimateRepository(db)),
    environmentalAssessments: wrap(
      new DatabaseEnvironmentalAssessmentRepository(db),
    ),
    evm: wrap(new DatabaseEvmRepository(db)),
    gantt: wrap(new DatabaseGanttRepository(db)),
    issues: wrap(new DatabaseIssueRepository(db)),
    landAcquisitionRecords: wrap(new DatabaseLandAcquisitionRepository(db)),
    milestones: wrap(new DatabaseMilestoneRepository(db)),
    notifications: wrap(new DatabaseNotificationRepository(db)),
    orgStructure: wrap(new DatabaseOrgStructureRepository(db)),
    permits: wrap(new DatabasePermitRepository(db)),
    procurementPackages: wrap(new DatabaseProcurementPackageRepository(db)),
    projectApprovalRequests: wrap(new DatabaseProjectApprovalRequestRepository(db)),
    projects: wrap(new DatabaseProjectRepository(db)),
    publicHearings: wrap(new DatabasePublicHearingRepository(db)),
    qualityGates: wrap(new DatabaseQualityGateRepository(db)),
    qualityInspections: wrap(new DatabaseQualityInspectionRepository(db)),
    risks: wrap(new DatabaseRiskRepository(db)),
    teamMemberships: wrap(new DatabaseTeamMembershipRepository(db)),
    torDocuments: wrap(new DatabaseTorDocumentRepository(db)),
    users: wrap(new DatabaseUserRepository(db)),
    wbs: wrap(new DatabaseWbsRepository(db)),
  };
}

function readBackendFromEnv(): PersistenceBackend {
  const raw = process.env.PERSISTENCE_BACKEND;
  if (raw === undefined || raw === '' || raw === 'db' || raw === 'dual') return 'db';
  if (raw === 'in_memory') {
    console.warn(
      `[registry] PERSISTENCE_BACKEND='in_memory' is no longer supported (PR-21b retired the InMemory layer). Falling back to 'db'.`,
    );
    return 'db';
  }
  console.warn(
    `[registry] Unknown PERSISTENCE_BACKEND='${raw}', falling back to 'db'.`,
  );
  return 'db';
}

let activeRegistry: RepositoryRegistry | null = null;

/**
 * Returns the active repository registry, lazily constructing it on first
 * call. Choice of backend is governed by `PERSISTENCE_BACKEND` (read once).
 *
 * Construction failures fall back to a fresh in-process pglite — so the
 * demo / dev environment stays live even when `DATABASE_URL` is broken.
 */
export function getRepositories(): RepositoryRegistry {
  if (activeRegistry) return activeRegistry;

  // Read but ignore (back-compat surface — accepts 'db' and 'dual' both as
  // canonical Database mode).
  readBackendFromEnv();

  const db = createDbClient();
  activeRegistry = createDatabaseRegistry(db);
  return activeRegistry;
}

/**
 * Test-only: replace the active registry. Used by suites that want to
 * inject fakes (Postgres mocks, in-memory variants tracking call counts,
 * etc.) without touching the underlying stores.
 *
 * @internal
 */
export function __setRepositoriesForTesting(registry: RepositoryRegistry): void {
  activeRegistry = registry;
}

/**
 * Test-only: reset the registry so the next `getRepositories()` call
 * reconstructs the default registry per the (current) env var.
 *
 * @internal
 */
export function __resetRepositoriesForTesting(): void {
  activeRegistry = null;
}
