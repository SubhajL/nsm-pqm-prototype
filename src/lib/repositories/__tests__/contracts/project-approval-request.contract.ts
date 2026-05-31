import { beforeEach, describe, expect, it } from 'vitest';

import type { ProjectApprovalRequest } from '@/types/project-approval-request';

import type { ProjectApprovalRequestRepository } from '../../project-approval-request.repository';

/**
 * PR-27 — Contract test for the project-approval workflow repository.
 *
 * Exercises the standard CRUD surface plus the per-project listing
 * accessor. Wired against the Database impl in
 * `src/lib/db/repositories/__tests__/database-contract.test.ts`.
 */
export function runProjectApprovalRequestRepositoryContract(
  makeRepo: () =>
    | Promise<ProjectApprovalRequestRepository>
    | ProjectApprovalRequestRepository,
) {
  describe('ProjectApprovalRequestRepository contract', () => {
    let repo: ProjectApprovalRequestRepository;

    beforeEach(async () => {
      repo = await makeRepo();
    });

    function sample(
      id: string,
      projectId = 'proj-x',
      overrides: Partial<ProjectApprovalRequest> = {},
    ): ProjectApprovalRequest {
      return {
        id,
        projectId,
        submittedBy: 'user-1',
        submittedAt: '2026-06-01T00:00:00.000Z',
        state: 'submitted',
        currentApproverRole: 'pm',
        decisionHistory: [],
        notes: '',
        ...overrides,
      };
    }

    it('create + findById round-trip', async () => {
      const entity = sample('par-1');
      await repo.create(entity);
      const found = await repo.findById('par-1');
      expect(found?.id).toBe('par-1');
      expect(found?.state).toBe('submitted');
      expect(found?.currentApproverRole).toBe('pm');
      expect(found?.decisionHistory).toEqual([]);
    });

    it('listByProject filters by projectId', async () => {
      await repo.create(sample('par-a', 'proj-a'));
      await repo.create(sample('par-b', 'proj-b'));
      await repo.create(sample('par-a2', 'proj-a'));

      const onlyA = await repo.listByProject('proj-a');
      expect(onlyA.map((entry) => entry.id).sort()).toEqual(['par-a', 'par-a2']);
    });

    it('update appends to decisionHistory and advances state', async () => {
      await repo.create(sample('par-2'));
      const updated = await repo.update('par-2', {
        state: 'pm_review',
        currentApproverRole: 'pm',
        decisionHistory: [
          {
            decidedBy: 'user-2',
            decidedAt: '2026-06-02T00:00:00.000Z',
            decision: 'approve',
            comment: 'looks good',
          },
        ],
      });
      expect(updated?.state).toBe('pm_review');
      expect(updated?.decisionHistory).toHaveLength(1);
      expect(updated?.decisionHistory[0]?.decision).toBe('approve');
    });

    it('delete removes the row', async () => {
      await repo.create(sample('par-3'));
      const removed = await repo.delete('par-3');
      expect(removed?.id).toBe('par-3');
      expect(await repo.findById('par-3')).toBeNull();
    });

    it('preserves terminal-state currentApproverRole=null on round-trip', async () => {
      await repo.create(
        sample('par-4', 'proj-x', {
          state: 'approved',
          currentApproverRole: null,
          decisionHistory: [
            {
              decidedBy: 'user-9',
              decidedAt: '2026-06-03T00:00:00.000Z',
              decision: 'approve',
              comment: 'final approval',
            },
          ],
          notes: 'all clear',
        }),
      );
      const found = await repo.findById('par-4');
      expect(found?.currentApproverRole).toBeNull();
      expect(found?.notes).toBe('all clear');
    });
  });
}
