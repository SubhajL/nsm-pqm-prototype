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

    function sampleChangeRequest(
      id: string,
      projectId = 'proj-x',
      overrides: Partial<ChangeRequest> = {},
    ): ChangeRequest {
      return {
        id,
        projectId,
        title: `CR ${id}`,
        reason: 'reason',
        budgetImpact: 0,
        scheduleImpact: 0,
        linkedWbs: '1.0',
        priority: 'medium',
        status: 'submitted',
        requestedBy: 'Requester',
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
        ...overrides,
      };
    }

    it('listByProject + status update + delete', async () => {
      const cr = sampleChangeRequest('cr-c-1', 'proj-a');
      await repo.create(cr);
      await repo.create(sampleChangeRequest('cr-c-2', 'proj-b'));

      const onlyA = await repo.listByProject('proj-a');
      expect(onlyA.some((entry) => entry.id === 'cr-c-1')).toBe(true);

      const updated = await repo.update(cr.id, { status: 'pm_approved' });
      expect(updated?.status).toBe('pm_approved');

      await repo.delete(cr.id);
      expect(await repo.findById(cr.id)).toBeNull();
    });

    it('PR-27 — round-trips the impact-analysis + approval-chain columns', async () => {
      const cr = sampleChangeRequest('cr-c-3', 'proj-c', {
        impactScheduleDays: 14,
        impactBudgetTHB: 2_500_000,
        impactScope: 'extra HMI screens',
        approvedByChain: ['user-pm', 'user-bureau'],
        rejectedReason: null,
        decidedAt: null,
        status: 'bureau_approved',
      });
      await repo.create(cr);

      const found = await repo.findById('cr-c-3');
      expect(found?.impactScheduleDays).toBe(14);
      expect(found?.impactBudgetTHB).toBe(2_500_000);
      expect(found?.impactScope).toBe('extra HMI screens');
      expect(found?.approvedByChain).toEqual(['user-pm', 'user-bureau']);
      expect(found?.status).toBe('bureau_approved');

      const updated = await repo.update('cr-c-3', {
        status: 'applied',
        approvedByChain: ['user-pm', 'user-bureau', 'user-admin'],
        decidedAt: '2026-07-01T10:00:00.000Z',
      });
      expect(updated?.status).toBe('applied');
      expect(updated?.approvedByChain).toEqual([
        'user-pm',
        'user-bureau',
        'user-admin',
      ]);
      expect(updated?.decidedAt).toBe('2026-07-01T10:00:00.000Z');
    });

    it('PR-27 — accepts legacy seed rows (pending/approved status)', async () => {
      const legacy = sampleChangeRequest('cr-legacy', 'proj-legacy', {
        status: 'approved',
        approvedBy: 'Sombat K.',
        approvedAt: '2026-05-20',
      });
      await repo.create(legacy);
      const found = await repo.findById('cr-legacy');
      expect(found?.status).toBe('approved');
    });
  });
}
