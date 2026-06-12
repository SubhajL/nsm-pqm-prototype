/**
 * PR-34 — multi-user readiness invariants, on a fresh pglite per test
 * group (same harness as database-contract.test.ts):
 *
 * 1. `updateIfState` compare-and-swap: the UPDATE carries
 *    `WHERE id = ? AND state = ?` so a transition raced by another writer
 *    returns null instead of clobbering.
 * 2. Migration 0010 unique indexes reject duplicate sequence rows.
 * 3. `findLatest*` accessors that back server-side sequence assignment.
 */
import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { beforeEach, describe, expect, it } from 'vitest';

import type { Db } from '@/lib/db/client';
import { runMigrations } from '@/lib/db/migrate';
import * as schema from '@/lib/db/schema';
import {
  DatabaseChangeRequestRepository,
  DatabaseContractAmendmentRepository,
  DatabaseKnowledgeAreaNoteRepository,
  DatabaseProcurementPackageRepository,
  DatabaseQualityGateRepository,
  DatabaseTorDocumentRepository,
} from '@/lib/db/repositories';
import type { ContractAmendment } from '@/types/contract-amendment';
import type { ProcurementPackage } from '@/types/procurement-package';
import type { TorDocument } from '@/types/tor-document';

async function freshDb(): Promise<Db> {
  const client = new PGlite();
  const db = drizzle(client, { schema });
  await runMigrations(db);
  return db;
}

function samplePackage(id: string): ProcurementPackage {
  return {
    id,
    projectId: 'proj-x',
    name: `จัดซื้อจัดจ้าง ${id}`,
    state: 'draft',
    budgetCeiling: 1_000_000,
    procurementMethod: 'e_bidding',
    openedAt: null,
    closedAt: null,
    notes: '',
  };
}

function sampleTor(id: string, version: number, packageId = 'pkg-x'): TorDocument {
  return {
    id,
    procurementPackageId: packageId,
    version,
    scopeSummary: 'งานก่อสร้าง',
    technicalRequirements: 'ตามแบบมาตรฐาน RID',
    deliverySchedule: '180 วัน',
    evaluationCriteria: 'ราคา + คุณภาพ 80/20',
    documentFileId: null,
    approvedAt: null,
  };
}

function sampleAmendment(
  id: string,
  amendmentNumber: number,
  contractId = 'ct-x',
): ContractAmendment {
  return {
    id,
    contractId,
    amendmentNumber,
    amendedAt: '2026-06-01',
    amountDelta: 100_000,
    scheduleDeltaDays: 30,
    reason: 'งานเพิ่มเติม',
    approvedBy: 'user-002',
    documentFileId: null,
  };
}

describe('updateIfState compare-and-swap', () => {
  let repo: DatabaseProcurementPackageRepository;

  beforeEach(async () => {
    repo = new DatabaseProcurementPackageRepository(await freshDb());
  });

  it('updates when the expected state still holds', async () => {
    await repo.create(samplePackage('pkg-cas-1'));
    const updated = await repo.updateIfState('pkg-cas-1', 'draft', {
      state: 'tor_review',
    });
    expect(updated?.state).toBe('tor_review');
  });

  it('returns null when the row was already transitioned (stale expectation)', async () => {
    await repo.create(samplePackage('pkg-cas-2'));
    await repo.updateIfState('pkg-cas-2', 'draft', { state: 'tor_review' });
    const lost = await repo.updateIfState('pkg-cas-2', 'draft', {
      state: 'cancelled',
    });
    expect(lost).toBeNull();
    expect((await repo.findById('pkg-cas-2'))?.state).toBe('tor_review');
  });

  it('returns null for an unknown id', async () => {
    expect(await repo.updateIfState('missing', 'draft', { state: 'tor_review' })).toBeNull();
  });
});

describe('updateIfState on status-keyed repositories', () => {
  it('change requests CAS on status', async () => {
    const db = await freshDb();
    const repo = new DatabaseChangeRequestRepository(db);
    await repo.create({
      id: 'cr-cas-1',
      projectId: 'proj-x',
      title: 'CR ทดสอบ',
      reason: 'reason',
      budgetImpact: 0,
      scheduleImpact: 0,
      linkedWbs: '1.0',
      priority: 'medium',
      status: 'submitted',
      requestedBy: 'user-002',
      requestedAt: '2026-06-01T00:00:00.000Z',
      approvedBy: null,
      approvedAt: null,
      attachments: [],
      workflow: [],
      impactScheduleDays: 0,
      impactBudgetTHB: 0,
      impactScope: '',
      approvedByChain: [],
      rejectedReason: null,
      decidedAt: null,
    });
    expect(
      await repo.updateIfState('cr-cas-1', 'submitted', { status: 'under_review' }),
    ).not.toBeNull();
    expect(
      await repo.updateIfState('cr-cas-1', 'submitted', { status: 'rejected' }),
    ).toBeNull();
  });

  it('quality gates CAS on status', async () => {
    const db = await freshDb();
    const repo = new DatabaseQualityGateRepository(db);
    await repo.create({
      id: 'qg-cas-1',
      projectId: 'proj-x',
      number: 1,
      name: 'ประตูคุณภาพ 1',
      nameEn: 'Gate 1',
      status: 'pending',
      date: null,
    });
    expect(
      await repo.updateIfState('qg-cas-1', 'pending', { status: 'passed' }),
    ).not.toBeNull();
    expect(
      await repo.updateIfState('qg-cas-1', 'pending', { status: 'conditional' }),
    ).toBeNull();
  });
});

describe('migration 0010 unique indexes', () => {
  it('rejects a duplicate TOR (package, version)', async () => {
    const repo = new DatabaseTorDocumentRepository(await freshDb());
    await repo.create(sampleTor('tor-uq-1', 2));
    await expect(repo.create(sampleTor('tor-uq-2', 2))).rejects.toThrow();
    await expect(
      repo.create(sampleTor('tor-uq-3', 2, 'pkg-other')),
    ).resolves.toBeTruthy();
  });

  it('rejects a duplicate amendment (contract, amendmentNumber)', async () => {
    const repo = new DatabaseContractAmendmentRepository(await freshDb());
    await repo.create(sampleAmendment('am-uq-1', 1));
    await expect(repo.create(sampleAmendment('am-uq-2', 1))).rejects.toThrow();
    await expect(
      repo.create(sampleAmendment('am-uq-3', 1, 'ct-other')),
    ).resolves.toBeTruthy();
  });

  it('rejects a duplicate note (project, area, version)', async () => {
    const repo = new DatabaseKnowledgeAreaNoteRepository(await freshDb());
    const note = {
      id: 'kn-uq-1',
      projectId: 'proj-x',
      area: 'integration' as const,
      version: 1,
      content: 'v1',
      authoredBy: 'user-001',
      authoredAt: '2026-06-01T00:00:00.000Z',
    };
    await repo.create(note);
    await expect(repo.create({ ...note, id: 'kn-uq-2' })).rejects.toThrow();
    await expect(
      repo.create({ ...note, id: 'kn-uq-3', version: 2 }),
    ).resolves.toBeTruthy();
  });
});

describe('findLatest accessors for server-side sequences', () => {
  it('findLatestByProcurementPackage returns the highest version', async () => {
    const repo = new DatabaseTorDocumentRepository(await freshDb());
    await repo.create(sampleTor('tor-seq-1', 1));
    await repo.create(sampleTor('tor-seq-2', 3));
    await repo.create(sampleTor('tor-seq-other', 9, 'pkg-other'));
    const latest = await repo.findLatestByProcurementPackage('pkg-x');
    expect(latest?.version).toBe(3);
    expect(await repo.findLatestByProcurementPackage('pkg-none')).toBeNull();
  });

  it('findLatestByContract returns the highest amendmentNumber', async () => {
    const repo = new DatabaseContractAmendmentRepository(await freshDb());
    await repo.create(sampleAmendment('am-seq-1', 1));
    await repo.create(sampleAmendment('am-seq-2', 4));
    const latest = await repo.findLatestByContract('ct-x');
    expect(latest?.amendmentNumber).toBe(4);
    expect(await repo.findLatestByContract('ct-none')).toBeNull();
  });
});

describe('approval decision history CAS (PR-34 QCHECK fix)', () => {
  it('a stale history length loses even when the state matches', async () => {
    const { DatabaseProjectApprovalRequestRepository } = await import(
      '@/lib/db/repositories'
    );
    const repo = new DatabaseProjectApprovalRequestRepository(await freshDb());
    await repo.create({
      id: 'par-cas-1',
      projectId: 'proj-x',
      submittedBy: 'user-1',
      submittedAt: '2026-06-01T00:00:00.000Z',
      state: 'submitted',
      currentApproverRole: 'pm',
      decisionHistory: [],
      notes: '',
    });
    const entry = {
      decidedBy: 'user-2',
      decidedAt: '2026-06-02T00:00:00.000Z',
      decision: 'request_changes' as const,
      comment: 'แก้ไขแผน',
    };
    // First request_changes: state stays 'submitted', history grows to 1.
    const first = await repo.updateIfStateAndHistoryLength('par-cas-1', 'submitted', 0, {
      decisionHistory: [entry],
    });
    expect(first?.decisionHistory).toHaveLength(1);
    // A raced second decision still expecting length 0 must lose...
    const stale = await repo.updateIfStateAndHistoryLength('par-cas-1', 'submitted', 0, {
      decisionHistory: [entry],
    });
    expect(stale).toBeNull();
    // ...and the committed history keeps the first entry.
    expect((await repo.findById('par-cas-1'))?.decisionHistory).toHaveLength(1);
  });
});
