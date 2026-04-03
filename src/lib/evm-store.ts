import seedEvmData from '@/data/evm-data.json';
import { generatedEvmPoints } from '@/lib/generated-project-data';
import type { EVMDataPoint } from '@/types/evm';

declare global {
  // eslint-disable-next-line no-var
  var __nsmEvmStore: EVMDataPoint[] | undefined;
  // eslint-disable-next-line no-var
  var __nsmEvmProjectRegistry: Set<string> | undefined;
}

export function getEvmStore() {
  if (!globalThis.__nsmEvmStore) {
    globalThis.__nsmEvmStore = [
      ...(seedEvmData as Omit<EVMDataPoint, 'id' | 'projectId'>[]).map(
        (point, index) => ({
          id: `evm-${index + 1}`,
          projectId: 'proj-001',
          ...point,
        }),
      ),
      ...generatedEvmPoints,
    ];
  }

  return globalThis.__nsmEvmStore;
}

export function getEvmProjectRegistry() {
  if (!globalThis.__nsmEvmProjectRegistry) {
    const projectIds = new Set(getEvmStore().map((point) => point.projectId));
    globalThis.__nsmEvmProjectRegistry = projectIds;
  }

  return globalThis.__nsmEvmProjectRegistry;
}

export function ensureEvmProjectInitialized(projectId: string) {
  getEvmProjectRegistry().add(projectId);
}
