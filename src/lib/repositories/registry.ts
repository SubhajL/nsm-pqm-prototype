/**
 * PR-18 — Repository registry.
 *
 * Single composition root. All API routes call `getRepositories().<domain>`
 * to reach persistence — they never touch `getXxxStore()` directly. When
 * PR-19 lands the Postgres adapters, swapping the active registry in
 * `bootstrap.ts` (or via `__setRepositoriesForTesting`) flips every API
 * route in one place.
 *
 * Test hooks (`__setRepositoriesForTesting` / `__resetRepositoriesForTesting`)
 * let suites inject fakes for unit tests without monkey-patching the
 * underlying stores. Production code MUST NOT call these.
 */

import {
  InMemoryAuditEventRepository,
  type AuditEventRepository,
} from './audit-event.repository';
import {
  InMemoryBoqRepository,
  type BoqRepository,
} from './boq.repository';
import {
  InMemoryChangeRequestRepository,
  type ChangeRequestRepository,
} from './change-request.repository';
import {
  InMemoryDailyReportRepository,
  type DailyReportRepository,
} from './daily-report.repository';
import {
  InMemoryDocumentRepository,
  type DocumentRepository,
} from './document.repository';
import {
  InMemoryEvmRepository,
  type EvmRepository,
} from './evm.repository';
import {
  InMemoryGanttRepository,
  type GanttRepository,
} from './gantt.repository';
import {
  InMemoryIssueRepository,
  type IssueRepository,
} from './issue.repository';
import {
  InMemoryMilestoneRepository,
  type MilestoneRepository,
} from './milestone.repository';
import {
  InMemoryNotificationRepository,
  type NotificationRepository,
} from './notification.repository';
import {
  InMemoryOrgStructureRepository,
  type OrgStructureRepository,
} from './org-structure.repository';
import {
  InMemoryProjectRepository,
  type ProjectRepository,
} from './project.repository';
import {
  InMemoryQualityGateRepository,
  type QualityGateRepository,
} from './quality-gate.repository';
import {
  InMemoryQualityInspectionRepository,
  type QualityInspectionRepository,
} from './quality-inspection.repository';
import {
  InMemoryRiskRepository,
  type RiskRepository,
} from './risk.repository';
import {
  InMemoryTeamMembershipRepository,
  type TeamMembershipRepository,
} from './team-membership.repository';
import {
  InMemoryUserRepository,
  type UserRepository,
} from './user.repository';
import {
  InMemoryWbsRepository,
  type WbsRepository,
} from './wbs.repository';

export interface RepositoryRegistry {
  auditEvents: AuditEventRepository;
  boq: BoqRepository;
  changeRequests: ChangeRequestRepository;
  dailyReports: DailyReportRepository;
  documents: DocumentRepository;
  evm: EvmRepository;
  gantt: GanttRepository;
  issues: IssueRepository;
  milestones: MilestoneRepository;
  notifications: NotificationRepository;
  orgStructure: OrgStructureRepository;
  projects: ProjectRepository;
  qualityGates: QualityGateRepository;
  qualityInspections: QualityInspectionRepository;
  risks: RiskRepository;
  teamMemberships: TeamMembershipRepository;
  users: UserRepository;
  wbs: WbsRepository;
}

function createInMemoryRegistry(): RepositoryRegistry {
  return {
    auditEvents: new InMemoryAuditEventRepository(),
    boq: new InMemoryBoqRepository(),
    changeRequests: new InMemoryChangeRequestRepository(),
    dailyReports: new InMemoryDailyReportRepository(),
    documents: new InMemoryDocumentRepository(),
    evm: new InMemoryEvmRepository(),
    gantt: new InMemoryGanttRepository(),
    issues: new InMemoryIssueRepository(),
    milestones: new InMemoryMilestoneRepository(),
    notifications: new InMemoryNotificationRepository(),
    orgStructure: new InMemoryOrgStructureRepository(),
    projects: new InMemoryProjectRepository(),
    qualityGates: new InMemoryQualityGateRepository(),
    qualityInspections: new InMemoryQualityInspectionRepository(),
    risks: new InMemoryRiskRepository(),
    teamMemberships: new InMemoryTeamMembershipRepository(),
    users: new InMemoryUserRepository(),
    wbs: new InMemoryWbsRepository(),
  };
}

let activeRegistry: RepositoryRegistry | null = null;

/**
 * Returns the active repository registry, lazily constructing the default
 * in-memory registry on first call. Idempotent and cheap — registries hold
 * no state beyond pointers to the underlying stores.
 */
export function getRepositories(): RepositoryRegistry {
  if (!activeRegistry) {
    activeRegistry = createInMemoryRegistry();
  }
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
 * reconstructs the default in-memory registry.
 *
 * @internal
 */
export function __resetRepositoriesForTesting(): void {
  activeRegistry = null;
}
