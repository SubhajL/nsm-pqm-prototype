import { describe, expect, it, beforeEach } from 'vitest';
import type { DailyReport } from '@/types/daily-report';
import type { DailyReportRepository } from '../../daily-report.repository';

export function runDailyReportRepositoryContract(
  makeRepo: () => Promise<DailyReportRepository> | DailyReportRepository,
) {
  describe('DailyReportRepository contract', () => {
    let repo: DailyReportRepository;

    beforeEach(async () => {
      repo = await makeRepo();
    });

    function sampleReport(id: string, projectId = 'proj-x'): DailyReport {
      return {
        id,
        projectId,
        reportNumber: 1,
        date: '2026-06-01',
        weather: 'แดด',
        temperature: 30,
        linkedWbs: [],
        personnel: [],
        totalPersonnel: 0,
        activities: [],
        photos: [],
        attachments: [],
        issues: '',
        signatures: {
          reporter: { name: '', signed: false, timestamp: null },
          inspector: { name: '', signed: false, timestamp: null },
        },
        status: 'draft',
        statusHistory: [],
      };
    }

    it('CRUD + listByProject', async () => {
      const r = sampleReport('dr-c-1', 'proj-a');
      await repo.create(r);
      await repo.create(sampleReport('dr-c-2', 'proj-b'));

      const a = await repo.listByProject('proj-a');
      expect(a.some((entry) => entry.id === 'dr-c-1')).toBe(true);

      await repo.update(r.id, { status: 'submitted' });
      expect((await repo.findById(r.id))?.status).toBe('submitted');

      await repo.delete(r.id);
      expect(await repo.findById(r.id)).toBeNull();
    });
  });
}
