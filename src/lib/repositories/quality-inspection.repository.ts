import type { InspectionsData, ITPStatus } from '@/types/quality';

type InspectionRecord = InspectionsData['inspectionRecords'][number];
type ItpItem = InspectionsData['itpItems'][number];

/**
 * Quality has two sibling collections (ITP items + inspection records) that
 * are co-managed. We expose both as a single repository so call-sites stay
 * consistent.
 *
 * PR-21b additions:
 *   - `updateInspection(id, patch)` lets routes apply checklist + workflow
 *     transitions explicitly (replaces the previous in-place mutation
 *     pattern that worked against InMemory only).
 *   - `updateItpStatus(itpItemId, status)` is the targeted bulk-update path
 *     used by `synchronizeItpStatuses()` after an inspection write.
 */
export interface QualityInspectionRepository {
  getData(): Promise<InspectionsData>;

  listInspections(): Promise<InspectionRecord[]>;
  listInspectionsByProject(projectId: string): Promise<InspectionRecord[]>;
  findInspectionById(id: string): Promise<InspectionRecord | null>;
  createInspection(record: InspectionRecord): Promise<InspectionRecord>;
  updateInspection(
    id: string,
    patch: Partial<InspectionRecord>,
  ): Promise<InspectionRecord | null>;
  deleteInspection(id: string): Promise<InspectionRecord | null>;

  listItpItems(): Promise<ItpItem[]>;
  listItpItemsByProject(projectId: string): Promise<ItpItem[]>;
  updateItpStatus(itpItemId: string, status: ITPStatus): Promise<ItpItem | null>;
}
