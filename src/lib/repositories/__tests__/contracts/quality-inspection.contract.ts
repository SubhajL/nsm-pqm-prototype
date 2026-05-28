import { describe, expect, it, beforeEach } from 'vitest';
import type { InspectionsData } from '@/types/quality';
import type { QualityInspectionRepository } from '../../quality-inspection.repository';

type InspectionRecord = InspectionsData['inspectionRecords'][number];

export function runQualityInspectionRepositoryContract(
  makeRepo: () =>
    | Promise<QualityInspectionRepository>
    | QualityInspectionRepository,
) {
  describe('QualityInspectionRepository contract', () => {
    let repo: QualityInspectionRepository;

    beforeEach(async () => {
      repo = await makeRepo();
    });

    function sampleInspection(
      id: string,
      projectId = 'proj-x',
    ): InspectionRecord {
      return {
        id,
        projectId,
        itpId: 'itp-x',
        title: `Inspection ${id}`,
        date: '2026-06-01',
        time: '10:00',
        inspectors: [],
        wbsLink: '1.0',
        standards: ['ISO 9001'],
        checklist: [],
        overallResult: 'pass',
        failReason: '',
        autoNCR: false,
        workflowStatus: 'draft',
      };
    }

    it('createInspection + findInspectionById round-trip', async () => {
      const insp = sampleInspection('qi-c-1', 'proj-a');
      await repo.createInspection(insp);
      const found = await repo.findInspectionById(insp.id);
      expect(found?.id).toBe(insp.id);
    });

    it('listInspectionsByProject filters correctly', async () => {
      await repo.createInspection(sampleInspection('qi-c-2', 'proj-a'));
      await repo.createInspection(sampleInspection('qi-c-3', 'proj-b'));
      const onlyA = await repo.listInspectionsByProject('proj-a');
      expect(onlyA.every((r) => r.projectId === 'proj-a')).toBe(true);
      expect(onlyA.some((r) => r.id === 'qi-c-2')).toBe(true);
    });

    it('deleteInspection removes the record', async () => {
      const insp = sampleInspection('qi-c-4');
      await repo.createInspection(insp);
      const deleted = await repo.deleteInspection(insp.id);
      expect(deleted?.id).toBe(insp.id);
      expect(await repo.findInspectionById(insp.id)).toBeNull();
    });

    it('exposes ITP items by project', async () => {
      const itps = await repo.listItpItemsByProject('proj-a');
      expect(Array.isArray(itps)).toBe(true);
      itps.forEach((item) => expect(item.projectId).toBe('proj-a'));
    });
  });
}
