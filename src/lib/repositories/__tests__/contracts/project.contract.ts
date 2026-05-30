import { describe, expect, it, beforeEach } from 'vitest';
import type { Project } from '@/types/project';
import type { ProjectRepository } from '../../project.repository';

/**
 * Behavioural contract for any `ProjectRepository` implementation.
 *
 * PR-18 ships `InMemoryProjectRepository`; PR-19's `DatabaseProjectRepository`
 * will be exercised against the SAME contract to prove behavioural parity.
 *
 * @param makeRepo  Factory that returns a FRESH, EMPTY-ish repository for each
 *                  test. (For the in-memory impl that means resetting the
 *                  underlying global store.)
 */
export function runProjectRepositoryContract(
  makeRepo: () => Promise<ProjectRepository> | ProjectRepository,
) {
  describe('ProjectRepository contract', () => {
    let repo: ProjectRepository;

    beforeEach(async () => {
      repo = await makeRepo();
    });

    function sampleProject(id: string, overrides: Partial<Project> = {}): Project {
      return {
        id,
        code: `PJ-test-${id}`,
        name: `Test project ${id}`,
        nameEn: `Test project ${id}`,
        projectClass: 'construction',
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

    it('create then findById returns the persisted entity', async () => {
      const project = sampleProject('proj-contract-1');
      await repo.create(project);
      const found = await repo.findById(project.id);
      expect(found?.id).toBe(project.id);
      expect(found?.name).toBe(project.name);
    });

    it('findById returns null for unknown ids', async () => {
      expect(await repo.findById('does-not-exist')).toBeNull();
    });

    it('list includes a created project', async () => {
      const project = sampleProject('proj-contract-2');
      await repo.create(project);
      const all = await repo.list();
      expect(all.some((p) => p.id === project.id)).toBe(true);
    });

    it('update patches in place and returns the patched entity', async () => {
      const project = sampleProject('proj-contract-3');
      await repo.create(project);
      const updated = await repo.update(project.id, { progress: 42 });
      expect(updated?.progress).toBe(42);
      const reread = await repo.findById(project.id);
      expect(reread?.progress).toBe(42);
    });

    it('update returns null when id is unknown', async () => {
      expect(await repo.update('nope', { progress: 1 })).toBeNull();
    });

    it('delete removes the entity and subsequent finds return null', async () => {
      const project = sampleProject('proj-contract-4');
      await repo.create(project);
      const deleted = await repo.delete(project.id);
      expect(deleted?.id).toBe(project.id);
      expect(await repo.findById(project.id)).toBeNull();
    });

    it('delete returns null when id is unknown', async () => {
      expect(await repo.delete('nope')).toBeNull();
    });
  });
}
