import { describe, expect, it, beforeEach } from 'vitest';
import type { ChangeRequest } from '@/types/document';
import type { ChangeRequestRepository } from '../../change-request.repository';

export function runChangeRequestRepositoryContract(
  makeRepo: () => Promise<ChangeRequestRepository> | ChangeRequestRepository,
) {
  describe('ChangeRequestRepository contract', () => {
    let repo: ChangeRequestRepository;

    beforeEach(async () => {
      repo = await makeRepo();
    });

    function sampleChangeRequest(id: string, projectId = 'proj-x'): ChangeRequest {
      return {
        id,
        projectId,
        title: `CR ${id}`,
        reason: 'reason',
        budgetImpact: 0,
        scheduleImpact: 0,
        linkedWbs: '1.0',
        priority: 'medium',
        status: 'pending',
        requestedBy: 'Requester',
        requestedAt: '2026-06-01T00:00:00.000Z',
        approvedBy: null,
        approvedAt: null,
        attachments: [],
        workflow: [],
      };
    }

    it('listByProject + status update + delete', async () => {
      const cr = sampleChangeRequest('cr-c-1', 'proj-a');
      await repo.create(cr);
      await repo.create(sampleChangeRequest('cr-c-2', 'proj-b'));

      const onlyA = await repo.listByProject('proj-a');
      expect(onlyA.some((entry) => entry.id === 'cr-c-1')).toBe(true);

      const updated = await repo.update(cr.id, { status: 'approved' });
      expect(updated?.status).toBe('approved');

      await repo.delete(cr.id);
      expect(await repo.findById(cr.id)).toBeNull();
    });
  });
}
