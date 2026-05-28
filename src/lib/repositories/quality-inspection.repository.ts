import { getQualityStore } from '@/lib/quality-store';
import type { InspectionsData } from '@/types/quality';

type InspectionRecord = InspectionsData['inspectionRecords'][number];
type ItpItem = InspectionsData['itpItems'][number];

/**
 * Quality has two sibling collections (ITP items + inspection records) that
 * live together in `getQualityStore()` and share mutation. We expose both as
 * a single repository so call-sites stay consistent with how they currently
 * read the store.
 */
export interface QualityInspectionRepository {
  getData(): Promise<InspectionsData>;

  listInspections(): Promise<InspectionRecord[]>;
  listInspectionsByProject(projectId: string): Promise<InspectionRecord[]>;
  findInspectionById(id: string): Promise<InspectionRecord | null>;
  createInspection(record: InspectionRecord): Promise<InspectionRecord>;
  deleteInspection(id: string): Promise<InspectionRecord | null>;

  listItpItems(): Promise<ItpItem[]>;
  listItpItemsByProject(projectId: string): Promise<ItpItem[]>;
}

export class InMemoryQualityInspectionRepository implements QualityInspectionRepository {
  async getData(): Promise<InspectionsData> {
    return getQualityStore();
  }

  async listInspections(): Promise<InspectionRecord[]> {
    return getQualityStore().inspectionRecords;
  }

  async listInspectionsByProject(projectId: string): Promise<InspectionRecord[]> {
    return getQualityStore().inspectionRecords.filter(
      (record) => record.projectId === projectId,
    );
  }

  async findInspectionById(id: string): Promise<InspectionRecord | null> {
    return getQualityStore().inspectionRecords.find((record) => record.id === id) ?? null;
  }

  async createInspection(record: InspectionRecord): Promise<InspectionRecord> {
    getQualityStore().inspectionRecords.push(record);
    return record;
  }

  async deleteInspection(id: string): Promise<InspectionRecord | null> {
    const records = getQualityStore().inspectionRecords;
    const index = records.findIndex((record) => record.id === id);
    if (index < 0) return null;
    const [removed] = records.splice(index, 1);
    return removed;
  }

  async listItpItems(): Promise<ItpItem[]> {
    return getQualityStore().itpItems;
  }

  async listItpItemsByProject(projectId: string): Promise<ItpItem[]> {
    return getQualityStore().itpItems.filter((item) => item.projectId === projectId);
  }
}
