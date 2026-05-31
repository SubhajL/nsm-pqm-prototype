import { beforeEach, describe, expect, it } from 'vitest';

import type { HandoverPacket } from '@/types/handover-packet';

import type { HandoverPacketRepository } from '../../handover-packet.repository';

export function runHandoverPacketRepositoryContract(
  makeRepo: () => Promise<HandoverPacketRepository> | HandoverPacketRepository,
) {
  describe('HandoverPacketRepository contract', () => {
    let repo: HandoverPacketRepository;

    beforeEach(async () => {
      repo = await makeRepo();
    });

    function sample(
      id: string,
      projectId = 'proj-x',
      contractId: string | null = null,
    ): HandoverPacket {
      return {
        id,
        projectId,
        contractId,
        state: 'draft',
        submittedAt: null,
        acceptedAt: null,
        warrantyStartDate: null,
        warrantyEndDate: null,
        acceptedBy: null,
        notes: '',
      };
    }

    it('listByProject filters by projectId', async () => {
      await repo.create(sample('ho-1', 'proj-a'));
      await repo.create(sample('ho-2', 'proj-b'));
      const onlyA = await repo.listByProject('proj-a');
      expect(onlyA).toHaveLength(1);
      expect(onlyA[0].projectId).toBe('proj-a');
    });

    it('CRUD round-trip', async () => {
      const packet = sample('ho-3');
      await repo.create(packet);
      const patched = await repo.update(packet.id, {
        state: 'submitted',
        submittedAt: '2026-06-15T10:00:00.000Z',
      });
      expect(patched?.state).toBe('submitted');
      expect(patched?.submittedAt).toBe('2026-06-15T10:00:00.000Z');
      await repo.delete(packet.id);
      expect(await repo.findById(packet.id)).toBeNull();
    });

    it('persists contractId + warranty window when provided', async () => {
      const packet: HandoverPacket = {
        ...sample('ho-4', 'proj-c', 'ct-7'),
        state: 'accepted',
        acceptedAt: '2026-09-01T00:00:00.000Z',
        warrantyStartDate: '2026-09-01',
        warrantyEndDate: '2027-09-01',
        acceptedBy: 'user-007',
      };
      const created = await repo.create(packet);
      expect(created.contractId).toBe('ct-7');
      expect(created.warrantyStartDate).toBe('2026-09-01');
      expect(created.warrantyEndDate).toBe('2027-09-01');
      expect(created.acceptedBy).toBe('user-007');
    });
  });
}
