/**
 * Repository barrel export (PR-18 ext PR-21b).
 *
 * Application code reaches persistence via `getRepositories()`. Individual
 * interface exports remain so contract tests can build typed factories
 * against the Database impls in `src/lib/db/repositories/`. The InMemory
 * impls were retired in PR-21b — only interfaces are re-exported here.
 */

export type { Repository } from './types';

export {
  type RepositoryRegistry,
  type PersistenceBackend,
  getRepositories,
  __setRepositoriesForTesting,
  __resetRepositoriesForTesting,
} from './registry';

export type { AuditEventRepository } from './audit-event.repository';
export type { BoqRepository } from './boq.repository';
export type { ChangeRequestRepository } from './change-request.repository';
export type { DailyReportRepository } from './daily-report.repository';
export type { DocumentRepository } from './document.repository';
export type { EvmRepository } from './evm.repository';
export type { GanttRepository } from './gantt.repository';
export type { IssueRepository } from './issue.repository';
export type { MilestoneRepository } from './milestone.repository';
export type { NotificationRepository } from './notification.repository';
export type { OrgStructureRepository } from './org-structure.repository';
export type { ProjectRepository } from './project.repository';
export type { QualityGateRepository } from './quality-gate.repository';
export type { QualityInspectionRepository } from './quality-inspection.repository';
export type { RiskRepository } from './risk.repository';
export type { TeamMembershipRepository } from './team-membership.repository';
export type { UserRepository } from './user.repository';
export type { WbsRepository } from './wbs.repository';
export type { PermitRepository } from './permit.repository';
export type { EnvironmentalAssessmentRepository } from './environmental-assessment.repository';
export type { PublicHearingRepository } from './public-hearing.repository';
export type { LandAcquisitionRepository } from './land-acquisition.repository';
