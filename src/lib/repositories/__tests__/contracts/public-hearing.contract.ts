import { beforeEach, describe, expect, it } from 'vitest';

import type { PublicHearing } from '@/types/public-hearing';

import type { PublicHearingRepository } from '../../public-hearing.repository';

export function runPublicHearingRepositoryContract(
  makeRepo: () =>
    | Promise<PublicHearingRepository>
    | PublicHearingRepository,
) {
  describe('PublicHearingRepository contract', () => {
    let repo: PublicHearingRepository;

    beforeEach(async () => {
      repo = await makeRepo();
    });

    function sample(id: string, projectId = 'proj-x'): PublicHearing {
      return {
        id,
        projectId,
        heldAt: '2026-03-12',
        location: 'หอประชุม อบต.ลำชี',
        attendeeCount: 120,
        summary: 'ประชุมรับฟังความคิดเห็นชุมชนเรื่องการก่อสร้าง',
        signedMinuteDocId: null,
      };
    }

    it('listByProject filters by projectId', async () => {
      await repo.create(sample('ph-c-1', 'proj-a'));
      await repo.create(sample('ph-c-2', 'proj-b'));
      const onlyA = await repo.listByProject('proj-a');
      expect(onlyA).toHaveLength(1);
      expect(onlyA[0].projectId).toBe('proj-a');
    });

    it('CRUD round-trip', async () => {
      const h = sample('ph-c-3');
      await repo.create(h);
      expect((await repo.findById(h.id))?.id).toBe(h.id);

      const patched = await repo.update(h.id, {
        signedMinuteDocId: 'doc-min-1',
        attendeeCount: 200,
      });
      expect(patched?.signedMinuteDocId).toBe('doc-min-1');
      expect(patched?.attendeeCount).toBe(200);

      await repo.delete(h.id);
      expect(await repo.findById(h.id)).toBeNull();
    });

    it('update returns null for unknown id', async () => {
      const result = await repo.update('ph-missing', { attendeeCount: 5 });
      expect(result).toBeNull();
    });
  });
}
