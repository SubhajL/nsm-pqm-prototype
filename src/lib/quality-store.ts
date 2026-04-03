import inspectionsData from '@/data/inspections.json';
import { generatedInspectionData } from '@/lib/generated-project-data';
import { synchronizeItpStatuses } from '@/lib/quality-consistency';
import type { InspectionsData } from '@/types/quality';

declare global {
  // eslint-disable-next-line no-var
  var __nsmQualityStore: InspectionsData | undefined;
}

export function getQualityStore() {
  if (!globalThis.__nsmQualityStore) {
    globalThis.__nsmQualityStore = {
      itpItems: [
        ...(inspectionsData.itpItems as InspectionsData['itpItems']),
        ...generatedInspectionData.itpItems,
      ],
      inspectionRecords: [
        ...(inspectionsData.inspectionRecords as InspectionsData['inspectionRecords']),
        ...generatedInspectionData.inspectionRecords,
      ],
    };
    synchronizeItpStatuses(globalThis.__nsmQualityStore);
  }

  return globalThis.__nsmQualityStore;
}
