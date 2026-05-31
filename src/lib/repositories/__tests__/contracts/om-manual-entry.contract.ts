import { beforeEach, describe, expect, it } from 'vitest';

import type { OmManualEntry } from '@/types/om-manual';

import type { OmManualEntryRepository } from '../../om-manual-entry.repository';

export function runOmManualEntryRepositoryContract(
  makeRepo: () => Promise<OmManualEntryRepository> | OmManualEntryRepository,
) {
  describe('OmManualEntryRepository contract', () => {
    let repo: OmManualEntryRepository;

    beforeEach(async () => {
      repo = await makeRepo();
    });

    function sample(
      id: string,
      packetId = 'ho-1',
      category: OmManualEntry['category'] = 'operations',
    ): OmManualEntry {
      return {
        id,
        handoverPacketId: packetId,
        category,
        title: `คู่มือ ${id}`,
        documentFileId: null,
        notes: '',
      };
    }

    it('listByHandoverPacket filters by handoverPacketId', async () => {
      await repo.create(sample('om-1', 'ho-a'));
      await repo.create(sample('om-2', 'ho-b'));
      const onlyA = await repo.listByHandoverPacket('ho-a');
      expect(onlyA).toHaveLength(1);
      expect(onlyA[0].handoverPacketId).toBe('ho-a');
    });

    it('persists category enum correctly across all four values', async () => {
      await repo.create(sample('om-3', 'ho-c', 'operations'));
      await repo.create(sample('om-4', 'ho-c', 'maintenance'));
      await repo.create(sample('om-5', 'ho-c', 'safety'));
      await repo.create(sample('om-6', 'ho-c', 'spare_parts'));
      const list = await repo.listByHandoverPacket('ho-c');
      const categories = list.map((row) => row.category).sort();
      expect(categories).toEqual([
        'maintenance',
        'operations',
        'safety',
        'spare_parts',
      ]);
    });

    it('CRUD round-trip', async () => {
      const entry = sample('om-7');
      await repo.create(entry);
      const patched = await repo.update(entry.id, { title: 'updated title' });
      expect(patched?.title).toBe('updated title');
      await repo.delete(entry.id);
      expect(await repo.findById(entry.id)).toBeNull();
    });
  });
}
