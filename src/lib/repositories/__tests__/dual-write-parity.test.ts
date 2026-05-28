/**
 * PR-20 — Dual-write parity assertion tests.
 *
 * Proves the `assertParity()` helper catches drift between primary
 * (InMemory) and secondary (Database) repositories.
 *
 * Strategy:
 *   1. Build a fresh pglite + run migrations.
 *   2. Wrap InMemoryProjectRepository + DatabaseProjectRepository with
 *      `dualWrite()` and perform a series of writes.
 *   3. `assertParity(inMemory, database)` → expected `{ parity: true }`.
 *   4. Mutate ONLY the secondary directly (simulate drift) and re-assert
 *      → expected `{ parity: false }` with non-empty differences.
 */

import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { beforeEach, describe, expect, it } from 'vitest';

import type { Db } from '@/lib/db/client';
import { DatabaseProjectRepository } from '@/lib/db/repositories';
import * as schema from '@/lib/db/schema';
import { runMigrations } from '@/lib/db/migrate';

import { dualWrite } from '../dual-write';
import { assertParity } from '../dual-write-parity';
import {
  InMemoryProjectRepository,
  type ProjectRepository,
} from '../project.repository';
import type { Project } from '@/types/project';

function sampleProject(id: string, overrides: Partial<Project> = {}): Project {
  return {
    id,
    code: `PJ-parity-${id}`,
    name: `Parity project ${id}`,
    nameEn: `Parity project ${id}`,
    type: 'construction',
    deliveryMethod: 'in_house',
    contractingModel: null,
    sizeTier: 'medium',
    status: 'planning',
    budget: 1_000_000,
    progress: 0,
    startDate: '2026-01-01',
    endDate: '2026-12-31',
    duration: 365,
    spiValue: 1,
    cpiValue: 1,
    scheduleHealth: 'on_schedule',
    managerId: 'user-test',
    managerName: 'Test PM',
    departmentId: 'dept-test',
    departmentName: 'Test Dept',
    openIssues: 0,
    highRisks: 0,
    currentMilestone: 0,
    totalMilestones: 0,
    currentLifecycleStage: 'planning',
    lifecycleStageHistory: [
      {
        stage: 'planning',
        enteredAt: '2026-01-01T00:00:00.000Z',
        enteredBy: null,
        artifactDocIds: [],
      },
    ],
    ...overrides,
  };
}

function resetInMemoryProjects() {
  (globalThis as Record<string, unknown>).__nsmProjectStore = undefined;
}

async function freshDb(): Promise<Db> {
  const client = new PGlite();
  const db = drizzle(client, { schema });
  await runMigrations(db);
  return db;
}

describe('assertParity (Project domain)', () => {
  let inMemory: InMemoryProjectRepository;
  let database: DatabaseProjectRepository;
  let wrapped: ProjectRepository;

  beforeEach(async () => {
    resetInMemoryProjects();
    inMemory = new InMemoryProjectRepository();
    database = new DatabaseProjectRepository(await freshDb());
    wrapped = dualWrite<ProjectRepository>(inMemory, database, {
      domain: 'projects',
    });
  });

  it('after a dual-write sequence, both backends agree → parity:true', async () => {
    // The InMemory repo is hydrated from JSON seeds. Mirror the seeded
    // state into the Database so the *starting* state matches.
    for (const p of await inMemory.list()) {
      await database.create(p);
    }

    await wrapped.create(sampleProject('parity-new-1'));
    await wrapped.create(sampleProject('parity-new-2', { progress: 10 }));
    await wrapped.update('parity-new-2', { progress: 25 });

    const result = await assertParity(inMemory, database, { domain: 'projects' });
    expect(result.parity).toBe(true);
    if (result.parity) {
      expect(result.methodsChecked).toContain('list');
      expect(result.methodsChecked).toContain('all');
    }
  });

  it('detects drift when ONLY the secondary is mutated', async () => {
    for (const p of await inMemory.list()) {
      await database.create(p);
    }
    await wrapped.create(sampleProject('parity-base'));

    // Directly mutate secondary — bypasses the dual-write wrapper.
    await database.create(sampleProject('drifted-only-in-db'));

    const result = await assertParity(inMemory, database, { domain: 'projects' });
    expect(result.parity).toBe(false);
    if (!result.parity) {
      const listDiff = result.differences.find((d) => d.method === 'list');
      expect(listDiff).toBeDefined();
      expect(listDiff!.onlyInSecondary.some(
        (item) => (item as Project).id === 'drifted-only-in-db',
      )).toBe(true);
      expect(listDiff!.onlyInPrimary).toEqual([]);
    }
  });

  it('detects field-level mismatches', async () => {
    for (const p of await inMemory.list()) {
      await database.create(p);
    }
    await wrapped.create(sampleProject('shared-id', { progress: 5 }));
    // Drift the secondary's progress value without going through dual-write.
    await database.update('shared-id', { progress: 99 });

    const result = await assertParity(inMemory, database, { domain: 'projects' });
    expect(result.parity).toBe(false);
    if (!result.parity) {
      const listDiff = result.differences.find((d) => d.method === 'list');
      expect(listDiff).toBeDefined();
      const mismatched = listDiff!.mismatched.find(
        (m) => (m.primary as Project).id === 'shared-id',
      );
      expect(mismatched).toBeDefined();
      expect((mismatched!.primary as Project).progress).toBe(5);
      expect((mismatched!.secondary as Project).progress).toBe(99);
    }
  });

  it('detects items present only in primary', async () => {
    // DO NOT seed the database with the InMemory baseline this time —
    // the seeded projects exist only in primary.
    const result = await assertParity(inMemory, database, { domain: 'projects' });
    expect(result.parity).toBe(false);
    if (!result.parity) {
      const listDiff = result.differences.find((d) => d.method === 'list');
      expect(listDiff!.onlyInPrimary.length).toBeGreaterThan(0);
    }
  });

  it('honours an explicit methods override', async () => {
    for (const p of await inMemory.list()) {
      await database.create(p);
    }
    const result = await assertParity(inMemory, database, {
      domain: 'projects',
      methods: ['list'],
    });
    expect(result.parity).toBe(true);
    if (result.parity) {
      expect(result.methodsChecked).toEqual(['list']);
    }
  });
});
