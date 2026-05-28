import { describe, expect, it, beforeEach } from 'vitest';
import type { BOQItem } from '@/hooks/useBOQ';
import type { BoqRepository } from '../../boq.repository';

export function runBoqRepositoryContract(
  makeRepo: () => Promise<BoqRepository> | BoqRepository,
) {
  describe('BoqRepository contract', () => {
    let repo: BoqRepository;

    beforeEach(async () => {
      repo = await makeRepo();
    });

    function sampleItem(id: string, wbsId = 'wbs-x'): BOQItem {
      return {
        id,
        wbsId,
        description: `BOQ ${id}`,
        quantity: 1,
        unit: 'ชิ้น',
        unitPrice: 100,
        total: 100,
      };
    }

    it('listByWbs only returns items for the requested wbs', async () => {
      await repo.create(sampleItem('boq-c-1', 'wbs-a'));
      await repo.create(sampleItem('boq-c-2', 'wbs-b'));
      const a = await repo.listByWbs('wbs-a');
      expect(a.every((item) => item.wbsId === 'wbs-a')).toBe(true);
      expect(a.some((item) => item.id === 'boq-c-1')).toBe(true);
    });

    it('update + delete behave correctly', async () => {
      const item = sampleItem('boq-c-3');
      await repo.create(item);
      const updated = await repo.update(item.id, { quantity: 5 });
      expect(updated?.quantity).toBe(5);
      await repo.delete(item.id);
      expect(await repo.findById(item.id)).toBeNull();
    });
  });
}
