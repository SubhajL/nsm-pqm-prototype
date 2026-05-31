/**
 * PR-21b — Database bootstrap (migrations + seed).
 *
 * The InMemory backend used to lazily hydrate stores from
 * `src/data/*.json` + `src/lib/generated-project-data.ts` on first read.
 * With the Postgres cutover the same convenience is needed: when an empty
 * / freshly-migrated DB is detected we copy that data into it so demos +
 * tests + dev still have a working seed.
 *
 * Memoised per `Db` instance: the first call kicks off migrations + seed
 * and caches the resulting promise; subsequent calls await the cached
 * promise (so repos see the schema after this returns). Idempotent —
 * every insert is guarded by an existence check, so re-running this is
 * safe (matches `scripts/backfill-db-from-fixtures.ts` semantics).
 */

import seedAuditLogs from '@/data/audit-logs.json';
import seedBoq from '@/data/boq.json';
import seedChangeRequests from '@/data/change-requests.json';
import seedDailyReports from '@/data/daily-reports.json';
import seedDocuments from '@/data/documents.json';
import seedEvm from '@/data/evm-data.json';
import seedGanttData from '@/data/gantt-tasks.json';
import seedInspections from '@/data/inspections.json';
import seedIssues from '@/data/issues.json';
import seedMilestones from '@/data/milestones.json';
import seedNotifications from '@/data/notifications.json';
import seedOrgStructure from '@/data/org-structure.json';
import seedMemberships from '@/data/project-memberships.json';
import seedProjects from '@/data/projects.json';
import seedQualityGates from '@/data/quality-gates.json';
import seedRisks from '@/data/risks.json';
import seedUsers from '@/data/users.json';
import seedWbs from '@/data/wbs.json';
import {
  generatedBoqItems,
  generatedChangeRequests,
  generatedDailyReports,
  generatedDocumentDataByProject,
  generatedEvmPoints,
  generatedGanttDataByProject,
  generatedInspectionData,
  generatedIssues,
  generatedMilestones,
  generatedQualityGates,
  generatedRisks,
  generatedWbsNodes,
} from '@/lib/generated-project-data';
import {
  documentFiles,
  documentFolders,
  documentPermissions,
  documentVersions,
  ganttProjects,
  itpItems,
} from '@/lib/db/schema';
import { runMigrations } from '@/lib/db/migrate';
import {
  DatabaseAuditEventRepository,
  DatabaseBoqRepository,
  DatabaseChangeRequestRepository,
  DatabaseDailyReportRepository,
  DatabaseEvmRepository,
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
import type { ChangeRequest, DocumentData, DocumentFile, Folder, PermissionEntry, VersionEntry } from '@/types/document';
import type { AuditEvent } from '@/types/audit';
import type { BOQItem } from '@/hooks/useBOQ';
import type { DailyReport } from '@/types/daily-report';
import type { EVMDataPoint } from '@/types/evm';
import type { GanttData, GanttLink, GanttTask } from '@/types/gantt';
import type { Milestone, Project } from '@/types/project';
import type { Notification } from '@/types/notification';
import type { OrgUnit, User } from '@/types/admin';
import type { InspectionRecord, InspectionsData, ITPItem, QualityGate } from '@/types/quality';
import type { Issue, Risk } from '@/types/risk';
import type { WBSNode } from '@/hooks/useWBS';
import type { ProjectMembership } from '@/lib/repositories/team-membership.repository';

import type { Db } from './client';

const readyByDb = new WeakMap<Db, Promise<void>>();

/**
 * Ensures the DB schema is migrated and the demo seed has been loaded.
 *
 * Memoised per `Db` instance — subsequent calls return the same Promise.
 * Tests that build their own pglite via `__setDbForTesting` will get a
 * fresh promise (different Db identity).
 */
export function ensureDatabaseSeeded(db: Db): Promise<void> {
  const existing = readyByDb.get(db);
  if (existing) return existing;

  const promise = (async () => {
    await runMigrations(db);
    await seedFromFixtures(db);
  })().catch((err) => {
    // Allow retry on transient failure by clearing the cache.
    readyByDb.delete(db);
    throw err;
  });

  readyByDb.set(db, promise);
  return promise;
}

/**
 * Test helper: clear the cache so the next `ensureDatabaseSeeded(db)` call
 * re-runs migrations + seed.
 *
 * @internal
 */
export function __resetDatabaseSeededForTesting(db?: Db): void {
  if (db) readyByDb.delete(db);
}

// --- legacy audit-log conversion -------------------------------------------

interface LegacyAuditLog {
  id: string;
  userId: string;
  userName: string;
  ip: string;
  os: string;
  module: string;
  action: string;
  timestamp: string;
}

function isLegacyAuditLog(entry: unknown): entry is LegacyAuditLog {
  if (!entry || typeof entry !== 'object') return false;
  const r = entry as Record<string, unknown>;
  return (
    typeof r.id === 'string' &&
    typeof r.userId === 'string' &&
    typeof r.module === 'string' &&
    typeof r.action === 'string' &&
    typeof r.timestamp === 'string' &&
    typeof r.userName === 'string' &&
    typeof r.os === 'string'
  );
}

function isAuditEvent(entry: unknown): entry is AuditEvent {
  if (!entry || typeof entry !== 'object') return false;
  const r = entry as Record<string, unknown>;
  return (
    typeof r.id === 'string' &&
    typeof r.timestamp === 'string' &&
    typeof r.requestId === 'string' &&
    typeof r.action === 'string' &&
    typeof r.resourceType === 'string' &&
    typeof r.resourceId === 'string'
  );
}

function migrateLegacyAuditLog(legacy: LegacyAuditLog): AuditEvent {
  return {
    id: legacy.id,
    timestamp: legacy.timestamp,
    requestId: 'legacy',
    actorId: legacy.userId === 'system' ? null : legacy.userId,
    actorRole: null,
    action: legacy.action,
    resourceType: legacy.module.toLowerCase(),
    resourceId: legacy.userId,
    projectId: null,
    before: null,
    after: null,
    decisionReason: null,
    authorityBasis: null,
    ipAddress: legacy.ip || null,
    userAgent: legacy.os || null,
  };
}

function buildSeedAuditEvents(): AuditEvent[] {
  return (seedAuditLogs as unknown[]).map((entry) => {
    if (isAuditEvent(entry)) return entry;
    if (isLegacyAuditLog(entry)) return migrateLegacyAuditLog(entry);
    const r = entry as Record<string, unknown>;
    return {
      id: typeof r.id === 'string' ? r.id : `evt-${crypto.randomUUID()}`,
      timestamp: typeof r.timestamp === 'string' ? r.timestamp : new Date(0).toISOString(),
      requestId: 'legacy',
      actorId: null,
      actorRole: null,
      action: typeof r.action === 'string' ? r.action : 'unknown',
      resourceType: 'unknown',
      resourceId: typeof r.id === 'string' ? r.id : 'unknown',
      projectId: null,
      before: null,
      after: null,
      decisionReason: null,
      authorityBasis: null,
      ipAddress: null,
      userAgent: null,
    };
  });
}

// --- per-domain seed merge -------------------------------------------------

function mergeUnique<T>(...arrays: T[][]): T[] {
  const seen = new Set<unknown>();
  const out: T[] = [];
  for (const arr of arrays) {
    for (const entry of arr) {
      const key = (entry as { id?: unknown }).id;
      if (key !== undefined) {
        if (seen.has(key)) continue;
        seen.add(key);
      }
      out.push(entry);
    }
  }
  return out;
}

async function seedFromFixtures(db: Db): Promise<void> {
  // Projects (required before child rows because of FKs).
  const projectRepo = new DatabaseProjectRepository(db);
  for (const project of seedProjects as Project[]) {
    if (!(await projectRepo.findById(project.id))) {
      await projectRepo.create(project);
    }
  }

  // WBS — fixture + generated.
  const wbsRepo = new DatabaseWbsRepository(db);
  for (const node of mergeUnique<WBSNode>(seedWbs as WBSNode[], generatedWbsNodes)) {
    if (!(await wbsRepo.findById(node.id))) {
      await wbsRepo.create(node);
    }
  }

  // Milestones — fixture + generated.
  const milestoneRepo = new DatabaseMilestoneRepository(db);
  for (const m of mergeUnique<Milestone>(seedMilestones as Milestone[], generatedMilestones)) {
    if (!(await milestoneRepo.findById(m.id))) {
      await milestoneRepo.create(m);
    }
  }

  // BOQ — fixture + generated.
  const boqRepo = new DatabaseBoqRepository(db);
  for (const item of mergeUnique<BOQItem>(seedBoq as BOQItem[], generatedBoqItems)) {
    if (!(await boqRepo.findById(item.id))) {
      await boqRepo.create(item);
    }
  }

  // Daily reports — fixture + generated.
  const drRepo = new DatabaseDailyReportRepository(db);
  for (const r of mergeUnique<DailyReport>(seedDailyReports as DailyReport[], generatedDailyReports)) {
    if (!(await drRepo.findById(r.id))) {
      await drRepo.create(r);
    }
  }

  // EVM (some seed rows lack `id`/`projectId` — synthesise like the
  // backfill script does for round-trip parity).
  const evmRepo = new DatabaseEvmRepository(db);
  const fixtureEvm = (seedEvm as Array<Partial<EVMDataPoint>>).map((raw, i) => ({
    id: raw.id ?? `evm-${i + 1}`,
    projectId: raw.projectId ?? 'proj-001',
    month: raw.month!,
    monthThai: raw.monthThai!,
    pv: raw.pv!,
    ev: raw.ev!,
    ac: raw.ac!,
    paidToDate: raw.paidToDate,
    spi: raw.spi!,
    cpi: raw.cpi!,
  }));
  for (const point of mergeUnique<EVMDataPoint>(fixtureEvm, generatedEvmPoints)) {
    if (!(await evmRepo.findById(point.id))) {
      await evmRepo.create(point);
    }
  }

  // Risks + Issues — fixture + generated.
  const riskRepo = new DatabaseRiskRepository(db);
  for (const risk of mergeUnique<Risk>(seedRisks as Risk[], generatedRisks)) {
    if (!(await riskRepo.findById(risk.id))) {
      await riskRepo.create(risk);
    }
  }
  const issueRepo = new DatabaseIssueRepository(db);
  for (const issue of mergeUnique<Issue>(seedIssues as Issue[], generatedIssues)) {
    if (!(await issueRepo.findById(issue.id))) {
      await issueRepo.create(issue);
    }
  }

  // Quality gates — fixture + generated.
  const gateRepo = new DatabaseQualityGateRepository(db);
  for (const gate of mergeUnique<QualityGate>(seedQualityGates as QualityGate[], generatedQualityGates)) {
    if (!(await gateRepo.findById(gate.id))) {
      await gateRepo.create(gate);
    }
  }

  // Inspections + ITP items.
  const inspectionRepo = new DatabaseQualityInspectionRepository(db);
  const fixtureInspections = seedInspections as InspectionsData;
  const inspectionRecordsAll = mergeUnique<InspectionRecord>(
    fixtureInspections.inspectionRecords,
    generatedInspectionData.inspectionRecords,
  );
  for (const record of inspectionRecordsAll) {
    if (!(await inspectionRepo.findInspectionById(record.id))) {
      await inspectionRepo.createInspection(record);
    }
  }
  const existingItps = await inspectionRepo.listItpItems();
  const existingItpIds = new Set(existingItps.map((item) => item.id));
  const itpAll = mergeUnique<ITPItem>(
    fixtureInspections.itpItems,
    generatedInspectionData.itpItems,
  );
  for (const item of itpAll) {
    if (!existingItpIds.has(item.id)) {
      await db.insert(itpItems).values(item);
    }
  }

  // Change requests — fixture + generated.
  const crRepo = new DatabaseChangeRequestRepository(db);
  for (const cr of mergeUnique<ChangeRequest>(seedChangeRequests as ChangeRequest[], generatedChangeRequests)) {
    if (!(await crRepo.findById(cr.id))) {
      await crRepo.create(cr);
    }
  }

  // Notifications.
  const notifRepo = new DatabaseNotificationRepository(db);
  const existingNotifs = await notifRepo.list();
  const existingNotifIds = new Set(existingNotifs.map((n) => n.id));
  for (const n of seedNotifications as Notification[]) {
    if (!existingNotifIds.has(n.id)) {
      await notifRepo.push(n);
    }
  }

  // Users.
  const userRepo = new DatabaseUserRepository(db);
  for (const user of seedUsers as User[]) {
    if (!(await userRepo.findById(user.id))) {
      await userRepo.create(user);
    }
  }

  // Org structure.
  const orgRepo = new DatabaseOrgStructureRepository(db);
  for (const unit of seedOrgStructure as OrgUnit[]) {
    if (!(await orgRepo.findById(unit.id))) {
      await orgRepo.create(unit);
    }
  }

  // Team memberships.
  const teamRepo = new DatabaseTeamMembershipRepository(db);
  for (const m of seedMemberships as ProjectMembership[]) {
    if (!(await teamRepo.has(m.projectId, m.userId))) {
      await teamRepo.add(m);
    }
  }

  // Documents — `documents.json` is the proj-001 blob; `generatedDocumentDataByProject`
  // covers the other projects.
  const docsByProject: Record<string, DocumentData> = {
    'proj-001': seedDocuments as DocumentData,
    ...generatedDocumentDataByProject,
  };
  for (const [projectId, data] of Object.entries(docsByProject)) {
    if (!data) continue;
    await seedProjectDocuments(db, projectId, data);
  }

  // Gantt — `gantt-tasks.json` is the proj-001 blob; `generatedGanttDataByProject`
  // covers the other projects.
  const ganttByProject: Record<string, GanttData> = {
    'proj-001': normalizeGanttData(seedGanttData as GanttData),
    ...generatedGanttDataByProject,
  };
  for (const [projectId, data] of Object.entries(ganttByProject)) {
    await db
      .insert(ganttProjects)
      .values({ projectId, tasks: data.data ?? [], links: data.links ?? [] })
      .onConflictDoNothing();
  }

  // PR-23 — งวดงาน-driven payment flow.
  //
  // Work periods, delivery slips, committee inspections, and payment
  // vouchers have no demo fixtures yet — the feature is gated behind
  // `FEATURE_RID_PAYMENT_FLOW` and ships with empty registers. When a
  // fixture set lands (PR-23 UI follow-up), seed it here in the same
  // pattern as the registers above.
  //   for (const wp of seedWorkPeriods as WorkPeriod[]) { ... }
  //   for (const slip of seedDeliverySlips as DeliverySlip[]) { ... }
  //   for (const insp of seedCommitteeInspections as CommitteeInspection[]) { ... }
  //   for (const voucher of seedPaymentVouchers as PaymentVoucher[]) { ... }

  // Audit events (with legacy log migration).
  const auditRepo = new DatabaseAuditEventRepository(db);
  const existingEvents = await auditRepo.list();
  const existingEventIds = new Set(existingEvents.map((e) => e.id));
  for (const event of buildSeedAuditEvents()) {
    if (!existingEventIds.has(event.id)) {
      await auditRepo.append(event, { id: event.id, timestamp: event.timestamp });
    }
  }
}

function normalizeGanttData(data: GanttData): GanttData {
  return {
    data: (data.data ?? []) as GanttTask[],
    links: (data.links ?? []) as GanttLink[],
  };
}

async function seedProjectDocuments(
  db: Db,
  projectId: string,
  data: DocumentData,
): Promise<void> {
  if (Array.isArray(data.folders)) {
    for (const folder of data.folders as Folder[]) {
      await db
        .insert(documentFolders)
        .values({
          id: folder.id,
          projectId,
          name: folder.name,
          parentId: folder.parentId,
          fileCount: folder.fileCount ?? null,
          pendingCount: folder.pendingCount ?? null,
        })
        .onConflictDoNothing();
    }
  }
  if (Array.isArray(data.files)) {
    for (const file of data.files as DocumentFile[]) {
      await db
        .insert(documentFiles)
        .values({
          id: file.id,
          projectId,
          folderId: file.folderId,
          name: file.name,
          type: file.type,
          version: file.version,
          size: file.size,
          uploadedBy: file.uploadedBy,
          uploadedAt: file.uploadedAt,
          status: file.status,
          workflow: file.workflow,
          sha256: file.sha256 ?? null,
          sizeBytes: file.sizeBytes ?? null,
          mimeType: file.mimeType ?? null,
          virusScanStatus: file.virusScanStatus ?? null,
          virusScanCheckedAt: file.virusScanCheckedAt ?? null,
          retentionPolicy: file.retentionPolicy ?? null,
          accessPolicy: file.accessPolicy ?? null,
        })
        .onConflictDoNothing();
    }
  }
  if (data.versionHistory && typeof data.versionHistory === 'object') {
    for (const [fileId, versions] of Object.entries(data.versionHistory)) {
      if (!Array.isArray(versions)) continue;
      for (const v of versions as VersionEntry[]) {
        await db
          .insert(documentVersions)
          .values({
            id: `${fileId}-v${v.version}`,
            projectId,
            fileId,
            version: v.version,
            date: v.date,
            author: v.author,
            note: v.note,
            versionLocked: v.versionLocked ?? false,
            sha256: v.sha256 ?? null,
          })
          .onConflictDoNothing();
      }
    }
  }
  if (Array.isArray(data.permissions)) {
    for (const perm of data.permissions as PermissionEntry[]) {
      await db
        .insert(documentPermissions)
        .values({
          id: `${projectId}:${perm.role}`,
          projectId,
          role: perm.role,
          upload: perm.upload,
          download: perm.download,
          edit: perm.edit,
          delete: perm.delete,
          manageFolder: perm.manageFolder,
        })
        .onConflictDoNothing();
    }
  }
}
