import { describe, expect, it, beforeEach } from 'vitest';
import type { TeamMembershipRepository } from '../../team-membership.repository';

export function runTeamMembershipRepositoryContract(
  makeRepo: () => Promise<TeamMembershipRepository> | TeamMembershipRepository,
) {
  describe('TeamMembershipRepository contract', () => {
    let repo: TeamMembershipRepository;

    beforeEach(async () => {
      repo = await makeRepo();
    });

    it('add + has + remove round-trip', async () => {
      const m = {
        projectId: 'proj-tm-c-1',
        userId: 'user-tm-c-1',
        assignmentRole: 'engineer' as const,
      };
      expect(await repo.has(m.projectId, m.userId)).toBe(false);
      expect(await repo.add(m)).toBe(true);
      expect(await repo.has(m.projectId, m.userId)).toBe(true);
      // duplicate add is a no-op (returns false)
      expect(await repo.add(m)).toBe(false);
      expect(await repo.remove(m.projectId, m.userId)).toBe(true);
      expect(await repo.has(m.projectId, m.userId)).toBe(false);
    });

    it('listByProject scopes correctly', async () => {
      await repo.add({
        projectId: 'proj-tm-c-2',
        userId: 'user-tm-c-2',
        assignmentRole: 'engineer',
      });
      await repo.add({
        projectId: 'proj-tm-c-3',
        userId: 'user-tm-c-3',
        assignmentRole: 'coordinator',
      });
      const onlyTwo = await repo.listByProject('proj-tm-c-2');
      expect(onlyTwo.every((entry) => entry.projectId === 'proj-tm-c-2')).toBe(
        true,
      );
    });
  });
}
