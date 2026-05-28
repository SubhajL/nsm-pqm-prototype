/**
 * PR-19 — Backfill the Postgres DB from the existing JSON fixtures.
 *
 * Run with:  `npm run db:seed`
 *
 * What it does:
 *   1. Connects to the DB via `getDb()` (Neon/Postgres if DATABASE_URL is set,
 *      otherwise an ephemeral pglite instance — useful for smoke-testing the
 *      script without provisioning a database).
 *   2. Runs migrations (idempotent — re-runs are no-ops).
 *   3. Reads each `src/data/*.json` fixture.
 *   4. Validates the projects fixture with the canonical Zod entity schema
 *      (catches stale seed data early — other domains don't yet have full
 *      entity-level Zod schemas).
 *   5. Inserts via the `DatabaseXxxRepository` instances — proves the repo
 *      impls work end-to-end on the same path the runtime code will use in
 *      PR-20/PR-21.
 *
 * Idempotency: every insert is guarded by `findById` so re-running this
 * script never duplicates rows. New fixtures added later are picked up on
 * the next run.
 *
 * NOTE: This script is intentionally NOT wired into a hot path. It does not
 * affect API routes. PR-20 will introduce dual-write; PR-21 will cut reads.
 */

import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

import { getDb } from '@/lib/db/client';
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

import { projectEntitySchema } from '@/types/project.schema';
import type { Project } from '@/types/project';
import type { Milestone } from '@/types/project';
import type { WBSNode } from '@/hooks/useWBS';
import type { BOQItem } from '@/hooks/useBOQ';
import type { DailyReport } from '@/types/daily-report';
import type { EVMDataPoint } from '@/types/evm';
import type { Risk, Issue } from '@/types/risk';
import type { QualityGate, InspectionsData } from '@/types/quality';
import type { ChangeRequest } from '@/types/document';
import type { Notification } from '@/types/notification';
import type { User, OrgUnit } from '@/types/admin';
import type { ProjectMembership } from '@/lib/project-membership-store';

const DATA_DIR = resolve(__dirname, '..', 'src', 'data');

function readJson<T>(name: string): T {
  return JSON.parse(readFileSync(join(DATA_DIR, name), 'utf-8')) as T;
}

async function main() {
  const db = getDb();
  console.log('[backfill] running migrations...');
  await runMigrations(db);

  console.log('[backfill] seeding projects...');
  const projectRepo = new DatabaseProjectRepository(db);
  const projects = readJson<Project[]>('projects.json');
  for (const project of projects) {
    const parsed = projectEntitySchema.parse(project);
    if (!(await projectRepo.findById(parsed.id))) {
      await projectRepo.create(parsed);
    }
  }
  console.log(`  inserted/skipped ${projects.length} projects`);

  console.log('[backfill] seeding milestones...');
  const milestoneRepo = new DatabaseMilestoneRepository(db);
  const milestones = readJson<Milestone[]>('milestones.json');
  for (const m of milestones) {
    if (!(await milestoneRepo.findById(m.id))) {
      await milestoneRepo.create(m);
    }
  }

  console.log('[backfill] seeding WBS...');
  const wbsRepo = new DatabaseWbsRepository(db);
  const wbs = readJson<WBSNode[]>('wbs.json');
  for (const node of wbs) {
    if (!(await wbsRepo.findById(node.id))) {
      await wbsRepo.create(node);
    }
  }

  console.log('[backfill] seeding BOQ...');
  const boqRepo = new DatabaseBoqRepository(db);
  const boq = readJson<BOQItem[]>('boq.json');
  for (const item of boq) {
    if (!(await boqRepo.findById(item.id))) {
      await boqRepo.create(item);
    }
  }

  console.log('[backfill] seeding daily reports...');
  const drRepo = new DatabaseDailyReportRepository(db);
  const reports = readJson<DailyReport[]>('daily-reports.json');
  for (const r of reports) {
    if (!(await drRepo.findById(r.id))) {
      await drRepo.create(r);
    }
  }

  console.log('[backfill] seeding EVM...');
  const evmRepo = new DatabaseEvmRepository(db);
  const evm = readJson<EVMDataPoint[] | Omit<EVMDataPoint, 'id' | 'projectId'>[]>(
    'evm-data.json',
  );
  for (let i = 0; i < evm.length; i++) {
    const raw = evm[i] as Partial<EVMDataPoint>;
    const point: EVMDataPoint = {
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
    };
    if (!(await evmRepo.findById(point.id))) {
      await evmRepo.create(point);
    }
  }

  console.log('[backfill] seeding risks + issues...');
  const riskRepo = new DatabaseRiskRepository(db);
  for (const risk of readJson<Risk[]>('risks.json')) {
    if (!(await riskRepo.findById(risk.id))) {
      await riskRepo.create(risk);
    }
  }
  const issueRepo = new DatabaseIssueRepository(db);
  for (const issue of readJson<Issue[]>('issues.json')) {
    if (!(await issueRepo.findById(issue.id))) {
      await issueRepo.create(issue);
    }
  }

  console.log('[backfill] seeding quality gates + inspections...');
  const gateRepo = new DatabaseQualityGateRepository(db);
  for (const gate of readJson<QualityGate[]>('quality-gates.json')) {
    if (!(await gateRepo.findById(gate.id))) {
      await gateRepo.create(gate);
    }
  }
  const inspectionRepo = new DatabaseQualityInspectionRepository(db);
  const inspections = readJson<InspectionsData>('inspections.json');
  for (const record of inspections.inspectionRecords) {
    if (!(await inspectionRepo.findInspectionById(record.id))) {
      await inspectionRepo.createInspection(record);
    }
  }
  // ITP items are seeded directly via raw insert because the repo
  // surface for itp items is read-only.
  const existingItps = await inspectionRepo.listItpItems();
  const existingItpIds = new Set(existingItps.map((item) => item.id));
  const { itpItems: itpTable } = await import('@/lib/db/schema');
  for (const item of inspections.itpItems) {
    if (!existingItpIds.has(item.id)) {
      await db.insert(itpTable).values(item);
    }
  }

  console.log('[backfill] seeding change requests...');
  const crRepo = new DatabaseChangeRequestRepository(db);
  for (const cr of readJson<ChangeRequest[]>('change-requests.json')) {
    if (!(await crRepo.findById(cr.id))) {
      await crRepo.create(cr);
    }
  }

  console.log('[backfill] seeding notifications...');
  const notifRepo = new DatabaseNotificationRepository(db);
  const existing = await notifRepo.list();
  const existingNotifIds = new Set(existing.map((n) => n.id));
  for (const n of readJson<Notification[]>('notifications.json')) {
    if (!existingNotifIds.has(n.id)) {
      await notifRepo.push(n);
    }
  }

  console.log('[backfill] seeding users + org structure...');
  const userRepo = new DatabaseUserRepository(db);
  for (const user of readJson<User[]>('users.json')) {
    if (!(await userRepo.findById(user.id))) {
      await userRepo.create(user);
    }
  }
  const orgRepo = new DatabaseOrgStructureRepository(db);
  for (const unit of readJson<OrgUnit[]>('org-structure.json')) {
    if (!(await orgRepo.findById(unit.id))) {
      await orgRepo.create(unit);
    }
  }

  console.log('[backfill] seeding team memberships...');
  const teamRepo = new DatabaseTeamMembershipRepository(db);
  for (const m of readJson<ProjectMembership[]>('project-memberships.json')) {
    if (!(await teamRepo.has(m.projectId, m.userId))) {
      await teamRepo.add(m);
    }
  }

  console.log('[backfill] seeding audit events (legacy log shape -> event)...');
  const auditRepo = new DatabaseAuditEventRepository(db);
  // The seed file is in the legacy AuditLog shape; reuse the migration
  // logic by importing the in-memory hydrator on this one-shot path.
  const { getAuditEventStore } = await import('@/lib/audit-log-store');
  const seedEvents = getAuditEventStore();
  const existingEvents = await auditRepo.list();
  const existingEventIds = new Set(existingEvents.map((e) => e.id));
  for (const event of seedEvents) {
    if (!existingEventIds.has(event.id)) {
      await auditRepo.append(event, { id: event.id, timestamp: event.timestamp });
    }
  }

  console.log('[backfill] done.');
}

main().catch((err) => {
  console.error('[backfill] FAILED:', err);
  process.exit(1);
});
