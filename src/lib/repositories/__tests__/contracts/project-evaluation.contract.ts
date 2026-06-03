import { beforeEach, describe, expect, it } from 'vitest';

import type { ProjectEvaluation } from '@/types/evaluation';

import type { ProjectEvaluationRepository } from '../../project-evaluation.repository';

export function runProjectEvaluationRepositoryContract(
  makeRepo: () =>
    | Promise<ProjectEvaluationRepository>
    | ProjectEvaluationRepository,
) {
  describe('ProjectEvaluationRepository contract', () => {
    let repo: ProjectEvaluationRepository;

    beforeEach(async () => {
      repo = await makeRepo();
    });

    function sample(
      projectId = 'proj-x',
      overrides: Partial<ProjectEvaluation> = {},
    ): ProjectEvaluation {
      return {
        projectId,
        projectName: 'โครงการทดสอบ',
        overallScore: 4.2,
        maxScore: 5,
        level: 'ดีมาก (Very Good)',
        percentage: 84,
        evaluatedBy: 'user-007',
        evaluatedAt: '2026-09-15',
        categories: [
          { name: 'งบประมาณ', nameEn: 'Budget', score: 4, note: 'ดี' },
          { name: 'คุณภาพ', nameEn: 'Quality', score: 5, note: '' },
        ],
        recommendation: 'ควรวางแผนล่วงหน้า',
        createdAt: '2026-09-15T00:00:00.000Z',
        updatedAt: '2026-09-15T00:00:00.000Z',
        ...overrides,
      };
    }

    it('findByProject returns null when absent', async () => {
      expect(await repo.findByProject('proj-none')).toBeNull();
    });

    it('upsert inserts, then findByProject returns it', async () => {
      await repo.upsert(sample('proj-a'));
      const fetched = await repo.findByProject('proj-a');
      expect(fetched?.projectId).toBe('proj-a');
      expect(fetched?.percentage).toBe(84);
    });

    it('upsert replaces the canonical row (no duplicate per project)', async () => {
      await repo.upsert(sample('proj-a', { percentage: 84, level: 'ดีมาก (Very Good)' }));
      await repo.upsert(sample('proj-a', { percentage: 60, level: 'พอใช้ (Fair)' }));
      const fetched = await repo.findByProject('proj-a');
      expect(fetched?.percentage).toBe(60);
      expect(fetched?.level).toBe('พอใช้ (Fair)');
    });

    it('preserves jsonb categories round-trip (Thai + English + notes)', async () => {
      await repo.upsert(sample('proj-b'));
      const fetched = await repo.findByProject('proj-b');
      expect(fetched?.categories).toHaveLength(2);
      expect(fetched?.categories[0]).toEqual({
        name: 'งบประมาณ',
        nameEn: 'Budget',
        score: 4,
        note: 'ดี',
      });
    });
  });
}
