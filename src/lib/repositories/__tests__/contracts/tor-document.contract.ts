import { beforeEach, describe, expect, it } from 'vitest';

import type { TorDocument } from '@/types/tor-document';

import type { TorDocumentRepository } from '../../tor-document.repository';

export function runTorDocumentRepositoryContract(
  makeRepo: () => Promise<TorDocumentRepository> | TorDocumentRepository,
) {
  describe('TorDocumentRepository contract', () => {
    let repo: TorDocumentRepository;

    beforeEach(async () => {
      repo = await makeRepo();
    });

    function sampleTor(id: string, packageId = 'pkg-x'): TorDocument {
      return {
        id,
        procurementPackageId: packageId,
        version: 1,
        scopeSummary: 'งานก่อสร้าง',
        technicalRequirements: 'ตามแบบมาตรฐาน RID',
        deliverySchedule: '180 วัน',
        evaluationCriteria: 'ราคา + คุณภาพ 80/20',
        documentFileId: null,
        approvedAt: null,
      };
    }

    it('listByProcurementPackage filters by packageId', async () => {
      await repo.create(sampleTor('tor-1', 'pkg-a'));
      await repo.create(sampleTor('tor-2', 'pkg-b'));
      const onlyA = await repo.listByProcurementPackage('pkg-a');
      expect(onlyA).toHaveLength(1);
      expect(onlyA[0].procurementPackageId).toBe('pkg-a');
    });

    it('CRUD round-trip', async () => {
      const t = sampleTor('tor-3');
      await repo.create(t);
      expect((await repo.findById(t.id))?.id).toBe(t.id);

      const patched = await repo.update(t.id, {
        version: 2,
        approvedAt: '2026-06-01',
      });
      expect(patched?.version).toBe(2);
      expect(patched?.approvedAt).toBe('2026-06-01');

      await repo.delete(t.id);
      expect(await repo.findById(t.id)).toBeNull();
    });
  });
}
