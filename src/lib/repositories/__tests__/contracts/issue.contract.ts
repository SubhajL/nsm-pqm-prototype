import { describe, expect, it, beforeEach } from 'vitest';
import type { Issue } from '@/types/risk';
import type { IssueRepository } from '../../issue.repository';

export function runIssueRepositoryContract(
  makeRepo: () => Promise<IssueRepository> | IssueRepository,
) {
  describe('IssueRepository contract', () => {
    let repo: IssueRepository;

    beforeEach(async () => {
      repo = await makeRepo();
    });

    function sampleIssue(id: string, projectId = 'proj-x'): Issue {
      return {
        id,
        projectId,
        title: `Issue ${id}`,
        severity: 'medium',
        status: 'open',
        assignee: 'Owner',
        linkedWbs: '-',
        slaHours: 48,
        tags: [],
        createdAt: '2026-01-01',
        closedAt: null,
      };
    }

    it('listByProject + CRUD round-trip', async () => {
      const issue = sampleIssue('iss-c-1', 'proj-a');
      await repo.create(issue);
      await repo.create(sampleIssue('iss-c-2', 'proj-b'));

      const onlyA = await repo.listByProject('proj-a');
      expect(onlyA.some((i) => i.id === 'iss-c-1')).toBe(true);
      expect(onlyA.every((i) => i.projectId === 'proj-a')).toBe(true);

      await repo.update(issue.id, { status: 'closed' });
      expect((await repo.findById(issue.id))?.status).toBe('closed');

      await repo.delete(issue.id);
      expect(await repo.findById(issue.id)).toBeNull();
    });
  });
}
