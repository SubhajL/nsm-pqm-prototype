/**
 * PR-18 — Repository barrel export.
 *
 * Application code reaches persistence via `getRepositories()`. The
 * individual interface + impl exports are useful for tests, future
 * `DatabaseXxxRepository` impls (PR-19), and Postgres-backed parity tests.
 */

export type { Repository } from './types';

export {
  type RepositoryRegistry,
  type PersistenceBackend,
  getRepositories,
  __setRepositoriesForTesting,
  __resetRepositoriesForTesting,
} from './registry';

export {
  type DualWriteOptions,
  dualWrite,
  recordSecondaryWriteFailure,
} from './dual-write';

export {
  type ParityDifference,
  type ParityResult,
  type AssertParityOptions,
  assertParity,
  recordParityCheck,
} from './dual-write-parity';

export {
  type AuditEventRepository,
  InMemoryAuditEventRepository,
} from './audit-event.repository';
export {
  type BoqRepository,
  InMemoryBoqRepository,
} from './boq.repository';
export {
  type ChangeRequestRepository,
  InMemoryChangeRequestRepository,
} from './change-request.repository';
export {
  type DailyReportRepository,
  InMemoryDailyReportRepository,
} from './daily-report.repository';
export {
  type DocumentRepository,
  InMemoryDocumentRepository,
} from './document.repository';
export {
  type EvmRepository,
  InMemoryEvmRepository,
} from './evm.repository';
export {
  type GanttRepository,
  InMemoryGanttRepository,
} from './gantt.repository';
export {
  type IssueRepository,
  InMemoryIssueRepository,
} from './issue.repository';
export {
  type MilestoneRepository,
  InMemoryMilestoneRepository,
} from './milestone.repository';
export {
  type NotificationRepository,
  InMemoryNotificationRepository,
} from './notification.repository';
export {
  type OrgStructureRepository,
  InMemoryOrgStructureRepository,
} from './org-structure.repository';
export {
  type ProjectRepository,
  InMemoryProjectRepository,
} from './project.repository';
export {
  type QualityGateRepository,
  InMemoryQualityGateRepository,
} from './quality-gate.repository';
export {
  type QualityInspectionRepository,
  InMemoryQualityInspectionRepository,
} from './quality-inspection.repository';
export {
  type RiskRepository,
  InMemoryRiskRepository,
} from './risk.repository';
export {
  type TeamMembershipRepository,
  InMemoryTeamMembershipRepository,
} from './team-membership.repository';
export {
  type UserRepository,
  InMemoryUserRepository,
} from './user.repository';
export {
  type WbsRepository,
  InMemoryWbsRepository,
} from './wbs.repository';
