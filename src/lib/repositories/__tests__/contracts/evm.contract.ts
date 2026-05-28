import { describe, expect, it, beforeEach } from 'vitest';
import type { EVMDataPoint } from '@/types/evm';
import type { EvmRepository } from '../../evm.repository';

export function runEvmRepositoryContract(
  makeRepo: () => Promise<EvmRepository> | EvmRepository,
) {
  describe('EvmRepository contract', () => {
    let repo: EvmRepository;

    beforeEach(async () => {
      repo = await makeRepo();
    });

    function samplePoint(
      id: string,
      projectId = 'proj-x',
      month = '2026-06',
    ): EVMDataPoint {
      return {
        id,
        projectId,
        month,
        monthThai: 'มิ.ย. 69',
        pv: 100,
        ev: 95,
        ac: 102,
        spi: 0.95,
        cpi: 0.93,
      };
    }

    it('create + findByProjectAndMonth + listByProject', async () => {
      const p = samplePoint('evm-c-1', 'proj-a', '2026-06');
      await repo.create(p);
      const found = await repo.findByProjectAndMonth('proj-a', '2026-06');
      expect(found?.id).toBe(p.id);
      const list = await repo.listByProject('proj-a');
      expect(list.some((entry) => entry.id === p.id)).toBe(true);
    });

    it('delete removes the point', async () => {
      const p = samplePoint('evm-c-2', 'proj-a', '2026-07');
      await repo.create(p);
      await repo.delete(p.id);
      expect(await repo.findById(p.id)).toBeNull();
    });

    it('ensureProjectInitialized registers a project id', async () => {
      await repo.ensureProjectInitialized('proj-evm-init');
      const ids = await repo.registeredProjectIds();
      expect(ids).toContain('proj-evm-init');
    });
  });
}
