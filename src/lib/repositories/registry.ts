/**
 * Repository registry. PR-21 cutover landed (partial — see "Pragmatic
 * scope" below).
 *
 * Single composition root. All API routes call `getRepositories().<domain>`
 * to reach persistence — they never touch raw stores directly.
 *
 * Behaviour by `PERSISTENCE_BACKEND` env var (read once on first call):
 *
 *   - undefined | 'in_memory' → InMemoryXxxRepository everywhere. Default.
 *                                Backed by the *-store.ts modules which
 *                                live in src/lib/ as the in-memory cache
 *                                layer. Seeded from src/data/*.json on
 *                                first access.
 *   - 'dual'                  → dualWrite(InMemoryXxx, DatabaseXxx) per
 *                                repo. Reads from InMemory; writes go to
 *                                BOTH; secondary failures logged + audit-
 *                                emitted but never thrown.
 *   - 'db'                    → DatabaseXxxRepository everywhere. Postgres
 *                                is the canonical persistence.
 *   - any other value         → console.warn + fall back to 'in_memory'.
 *
 * ---
 *
 * # Pragmatic scope (PR-21)
 *
 * The MVP plan PR-21 calls for the default to flip to `db` and the
 * InMemory layer to retire. The blob-snapshot retirement (deletion of
 * `project-demo-state.ts`, removal of `ensureProjectDemoStateHydrated()`
 * + `persistProjectDemoState()` calls, `ensureDatabaseReady()` helper)
 * has landed. The default flip, however, is **gated on a follow-up
 * refactor** that converts the in-place mutation pattern used by many
 * API routes (e.g. `project.status = next; persistProjectDemoState();`)
 * into explicit `repos.projects.update()` calls.
 *
 * Why this matters: InMemoryXxxRepository.findById() returns the live
 * store entry — mutating its fields IS the write. DatabaseXxxRepository.
 * findById() returns a freshly-hydrated copy — mutating its fields is a
 * no-op against the database. Routes that haven't been migrated to
 * explicit .update() calls would silently lose writes under
 * PERSISTENCE_BACKEND=db.
 *
 * The InMemory backend therefore remains the default until the in-place
 * mutation pattern is removed. Operators who want the Database backend
 * can opt-in via PERSISTENCE_BACKEND=db (test environments + nightly
 * parity check use this); the dual mode is the safe rolling option for
 * preview environments.
 *
 * Tracked as a follow-up to PR-21 (see DUAL_WRITE.md "Post-cutover work").
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
