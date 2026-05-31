import { beforeEach, describe, expect, it } from 'vitest';

import type { AsBuiltDrawing } from '@/types/as-built-drawing';

import type { AsBuiltDrawingRepository } from '../../as-built-drawing.repository';

export function runAsBuiltDrawingRepositoryContract(
  makeRepo: () => Promise<AsBuiltDrawingRepository> | AsBuiltDrawingRepository,
) {
  describe('AsBuiltDrawingRepository contract', () => {
    let repo: AsBuiltDrawingRepository;

    beforeEach(async () => {
      repo = await makeRepo();
    });

    function sample(id: string, packetId = 'ho-1'): AsBuiltDrawing {
      return {
        id,
        handoverPacketId: packetId,
        drawingNumber: `AB-CONST-${id}`,
        title: `แบบก่อสร้างจริง ${id}`,
        documentFileId: null,
        revision: 'Rev A',
        uploadedAt: '2026-08-15T09:00:00.000Z',
        notes: '',
      };
    }

    it('listByHandoverPacket filters by handoverPacketId', async () => {
      await repo.create(sample('ab-1', 'ho-a'));
      await repo.create(sample('ab-2', 'ho-b'));
      const onlyA = await repo.listByHandoverPacket('ho-a');
      expect(onlyA).toHaveLength(1);
      expect(onlyA[0].handoverPacketId).toBe('ho-a');
    });

    it('CRUD round-trip', async () => {
      const drawing = sample('ab-3');
      await repo.create(drawing);
      const patched = await repo.update(drawing.id, { revision: 'Rev B' });
      expect(patched?.revision).toBe('Rev B');
      await repo.delete(drawing.id);
      expect(await repo.findById(drawing.id)).toBeNull();
    });
  });
}
