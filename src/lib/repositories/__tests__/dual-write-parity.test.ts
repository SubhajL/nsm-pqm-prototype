/**
 * Dual-write parity assertion tests.
 *
 * Proves the `assertParity()` helper catches drift between two
 * `DatabaseXxxRepository` instances. Post-PR-21 the InMemory backend is no
 * longer instantiated by the registry, but the parity check remains useful
 * for future blue/green DB migrations (compare the "old" Postgres against
 * the "new" Postgres during a migration window).
 *
 * Strategy:
 *   1. Build two fresh pglite + run migrations.
 *   2. Wrap the pair with `dualWrite()` and perform a series of writes.
 *   3. `assertParity(primary, secondary)` → expected `{ parity: true }`.
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
import type { ProjectRepository } from '../project.repository';
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

async function freshDb(): Promise<Db> {
  const client = new PGlite();
  const db = drizzle(client, { schema });
  await runMigrations(db);
  return db;
}

describe('assertParity (Project domain — DB ↔ DB)', () => {
  let primary: DatabaseProjectRepository;
  let secondary: DatabaseProjectRepository;
  let wrapped: ProjectRepository;

  beforeEach(async () => {
    primary = new DatabaseProjectRepository(await freshDb());
    secondary = new DatabaseProjectRepository(await freshDb());
    wrapped = dualWrite<ProjectRepository>(primary, secondary, {
      domain: 'projects',
    });
  });

  it('after a dual-write sequence, both backends agree → parity:true', async () => {
    await wrapped.create(sampleProject('parity-new-1'));
    await wrapped.create(sampleProject('parity-new-2', { progress: 10 }));
    await wrapped.update('parity-new-2', { progress: 25 });

    const result = await assertParity(primary, secondary, { domain: 'projects' });
    expect(result.parity).toBe(true);
    if (result.parity) {
      expect(result.methodsChecked).toContain('list');
      expect(result.methodsChecked).toContain('all');
    }
  });

  it('detects drift when ONLY the secondary is mutated', async () => {
    await wrapped.create(sampleProject('parity-base'));

    // Directly mutate secondary — bypasses the dual-write wrapper.
    await secondary.create(sampleProject('drifted-only-in-secondary'));

    const result = await assertParity(primary, secondary, { domain: 'projects' });
    expect(result.parity).toBe(false);
    if (!result.parity) {
      const listDiff = result.differences.find((d) => d.method === 'list');
      expect(listDiff).toBeDefined();
      expect(
        listDiff!.onlyInSecondary.some(
          (item) => (item as Project).id === 'drifted-only-in-secondary',
        ),
      ).toBe(true);
      expect(listDiff!.onlyInPrimary).toEqual([]);
    }
  });

  it('detects field-level mismatches', async () => {
    await wrapped.create(sampleProject('shared-id', { progress: 5 }));
    // Drift the secondary's progress value without going through dual-write.
    await secondary.update('shared-id', { progress: 99 });

    const result = await assertParity(primary, secondary, { domain: 'projects' });
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
    await primary.create(sampleProject('only-in-primary'));
    const result = await assertParity(primary, secondary, { domain: 'projects' });
    expect(result.parity).toBe(false);
    if (!result.parity) {
      const listDiff = result.differences.find((d) => d.method === 'list');
      expect(listDiff!.onlyInPrimary.length).toBeGreaterThan(0);
    }
  });

  it('honours an explicit methods override', async () => {
    await wrapped.create(sampleProject('override-id'));
    const result = await assertParity(primary, secondary, {
      domain: 'projects',
      methods: ['list'],
    });
    expect(result.parity).toBe(true);
    if (result.parity) {
      expect(result.methodsChecked).toEqual(['list']);
    }
  });
});
