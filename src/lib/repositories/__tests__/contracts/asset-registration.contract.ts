import { beforeEach, describe, expect, it } from 'vitest';

import type { AssetRegistration } from '@/types/asset-registration';

import type { AssetRegistrationRepository } from '../../asset-registration.repository';

export function runAssetRegistrationRepositoryContract(
  makeRepo: () =>
    | Promise<AssetRegistrationRepository>
    | AssetRegistrationRepository,
) {
  describe('AssetRegistrationRepository contract', () => {
    let repo: AssetRegistrationRepository;

    beforeEach(async () => {
      repo = await makeRepo();
    });

    function sample(id: string, packetId = 'ho-1'): AssetRegistration {
      return {
        id,
        handoverPacketId: packetId,
        assetCode: `WS-LCS-${id}`,
        assetType: 'hydraulic',
        installedAt: '2026-08-01',
        installedLocation: 'อ่างเก็บน้ำ ทดสอบ',
        initialValue: 1_250_000,
        costCenter: null,
        notes: '',
      };
    }

    it('listByHandoverPacket filters by handoverPacketId', async () => {
      await repo.create(sample('ar-1', 'ho-a'));
      await repo.create(sample('ar-2', 'ho-b'));
      const onlyA = await repo.listByHandoverPacket('ho-a');
      expect(onlyA).toHaveLength(1);
      expect(onlyA[0].handoverPacketId).toBe('ho-a');
    });

    it('persists costCenter when supplied', async () => {
      const ar: AssetRegistration = {
        ...sample('ar-3'),
        costCenter: 'CC-RID-OPS-01',
      };
      const created = await repo.create(ar);
      expect(created.costCenter).toBe('CC-RID-OPS-01');
    });

    it('CRUD round-trip', async () => {
      const ar = sample('ar-4');
      await repo.create(ar);
      const patched = await repo.update(ar.id, { initialValue: 2_500_000 });
      expect(patched?.initialValue).toBe(2_500_000);
      await repo.delete(ar.id);
      expect(await repo.findById(ar.id)).toBeNull();
    });
  });
}
