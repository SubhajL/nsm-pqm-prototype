/**
 * PR-18 — Repository registry. PR-20 extended with `PERSISTENCE_BACKEND` env switching.
 *
 * Single composition root. All API routes call `getRepositories().<domain>`
 * to reach persistence — they never touch `getXxxStore()` directly.
 *
 * Behaviour by `PERSISTENCE_BACKEND` env var (read once on first call):
 *
 *   - undefined | 'in_memory'  → InMemoryXxxRepository everywhere. This is
 *                                 the default; identical to pre-PR-20 behaviour
 *                                 so every existing test stays green.
 *   - 'dual'                   → dualWrite(InMemoryXxx, DatabaseXxx) per
 *                                 repo. Reads from InMemory; writes go to
 *                                 BOTH; secondary failures logged + audit-
 *                                 emitted but never thrown. Use for the
 *                                 PR-20 soak window.
 *   - 'db'                     → DatabaseXxxRepository everywhere. PR-21's
 *                                 cutover flag — not yet validated; we
 *                                 console.warn but still honour the request.
 *   - any other value          → console.warn + fall back to in_memory.
 *
 * Dual mode tries to construct a Database client via PR-19's
 * `createDbClient()`. If that throws (e.g. bad DATABASE_URL, unreachable
 * host), we log + audit + degrade to pure InMemory mode rather than
 * crashing startup — the soak window must be safe to enable in preview
 * environments without risking demo availability.
 *
 * Test hooks (`__setRepositoriesForTesting` / `__resetRepositoriesForTesting`)
 * let suites inject fakes for unit tests without monkey-patching the
 * underlying stores. Production code MUST NOT call these.
 */

import { createDbClient, type Db } from '@/lib/db/client';
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
import { dualWrite } from './dual-write';
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

export type PersistenceBackend = 'in_memory' | 'dual' | 'db';

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

function createDatabaseRegistry(db: Db): RepositoryRegistry {
  return {
    auditEvents: new DatabaseAuditEventRepository(db),
    boq: new DatabaseBoqRepository(db),
    changeRequests: new DatabaseChangeRequestRepository(db),
    dailyReports: new DatabaseDailyReportRepository(db),
    documents: new DatabaseDocumentRepository(db),
    evm: new DatabaseEvmRepository(db),
    gantt: new DatabaseGanttRepository(db),
    issues: new DatabaseIssueRepository(db),
    milestones: new DatabaseMilestoneRepository(db),
    notifications: new DatabaseNotificationRepository(db),
    orgStructure: new DatabaseOrgStructureRepository(db),
    projects: new DatabaseProjectRepository(db),
    qualityGates: new DatabaseQualityGateRepository(db),
    qualityInspections: new DatabaseQualityInspectionRepository(db),
    risks: new DatabaseRiskRepository(db),
    teamMemberships: new DatabaseTeamMembershipRepository(db),
    users: new DatabaseUserRepository(db),
    wbs: new DatabaseWbsRepository(db),
  };
}

/**
 * Wrap an InMemory registry + Database registry into a dual-write registry.
 * Each domain's repo becomes a `dualWrite(inMemory, database)` Proxy. The
 * audit-event repo is special-cased: it carries no secondary auditRepo to
 * avoid infinite recursion if the audit secondary write itself fails.
 */
function createDualWriteRegistry(
  primary: RepositoryRegistry,
  secondary: RepositoryRegistry,
): RepositoryRegistry {
  const auditRepo = primary.auditEvents;
  const wrap = <K extends keyof RepositoryRegistry>(
    key: K,
  ): RepositoryRegistry[K] =>
    dualWrite(primary[key], secondary[key], {
      domain: key,
      auditRepo: key === 'auditEvents' ? undefined : auditRepo,
    }) as RepositoryRegistry[K];

  return {
    auditEvents: wrap('auditEvents'),
    boq: wrap('boq'),
    changeRequests: wrap('changeRequests'),
    dailyReports: wrap('dailyReports'),
    documents: wrap('documents'),
    evm: wrap('evm'),
    gantt: wrap('gantt'),
    issues: wrap('issues'),
    milestones: wrap('milestones'),
    notifications: wrap('notifications'),
    orgStructure: wrap('orgStructure'),
    projects: wrap('projects'),
    qualityGates: wrap('qualityGates'),
    qualityInspections: wrap('qualityInspections'),
    risks: wrap('risks'),
    teamMemberships: wrap('teamMemberships'),
    users: wrap('users'),
    wbs: wrap('wbs'),
  };
}

/**
 * Record a one-shot audit event noting that the registry degraded from
 * `dual` to `in_memory` because the Database client could not be built.
 *
 * Best-effort: if the audit append itself throws, we just log — startup
 * must never crash because of this.
 */
function emitDualWriteFallbackAudit(
  primary: RepositoryRegistry,
  err: unknown,
): void {
  const errorMessage = err instanceof Error ? err.message : String(err);
  primary.auditEvents
    .append({
      requestId: 'system:registry-bootstrap',
      actorId: null,
      actorRole: null,
      action: 'dual_write_fallback_to_in_memory',
      resourceType: 'persistence_backend',
      resourceId: 'registry',
      projectId: null,
      before: null,
      after: { errorMessage },
      decisionReason:
        'PERSISTENCE_BACKEND=dual requested but Database client could not be built; degraded to in_memory.',
      authorityBasis: 'MVP_PLAN:PR-20:dual-write-soak',
      ipAddress: null,
      userAgent: null,
    })
    .catch((auditErr) => {
      console.error('[registry] fallback audit emission failed', auditErr);
    });
}

function readBackendFromEnv(): PersistenceBackend {
  const raw = process.env.PERSISTENCE_BACKEND;
  if (raw === undefined || raw === '' || raw === 'in_memory') return 'in_memory';
  if (raw === 'dual') return 'dual';
  if (raw === 'db') return 'db';
  console.warn(
    `[registry] Unknown PERSISTENCE_BACKEND='${raw}', falling back to in_memory.`,
  );
  return 'in_memory';
}

let activeRegistry: RepositoryRegistry | null = null;

/**
 * Returns the active repository registry, lazily constructing it on first
 * call. The choice between InMemory / dual / Database is driven by the
 * `PERSISTENCE_BACKEND` env var (read once on first call).
 */
export function getRepositories(): RepositoryRegistry {
  if (activeRegistry) return activeRegistry;

  const backend = readBackendFromEnv();
  const inMemory = createInMemoryRegistry();

  if (backend === 'in_memory') {
    activeRegistry = inMemory;
    return activeRegistry;
  }

  // For both 'dual' and 'db' we need a Database client. Failures here
  // degrade to in_memory rather than crashing — the demo must stay live.
  let db: Db;
  try {
    db = createDbClient();
  } catch (err) {
    console.error(
      `[registry] PERSISTENCE_BACKEND='${backend}' but createDbClient() threw; falling back to in_memory.`,
      err,
    );
    activeRegistry = inMemory;
    emitDualWriteFallbackAudit(inMemory, err);
    return activeRegistry;
  }

  // Migrations are best-effort during bootstrap: a fresh pglite (no
  // DATABASE_URL set) needs them; a migrated Neon instance already has
  // them. Schedule asynchronously so getRepositories() stays synchronous.
  runMigrations(db).catch((err) => {
    console.error('[registry] auto-migration failed (continuing with current schema)', err);
  });

  if (backend === 'db') {
    console.warn(
      '[registry] PERSISTENCE_BACKEND=db requested. This is the PR-21 cutover mode and has not yet been validated by a clean soak window. Proceed with caution.',
    );
    activeRegistry = createDatabaseRegistry(db);
    return activeRegistry;
  }

  // dual
  const database = createDatabaseRegistry(db);
  activeRegistry = createDualWriteRegistry(inMemory, database);
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
