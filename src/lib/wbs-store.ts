import seedWbsNodes from '@/data/wbs.json';
import { generatedWbsNodes } from '@/lib/generated-project-data';
import { normalizeProjectWbsProgress } from '@/lib/wbs-progress-normalization';
import type { WBSNode } from '@/hooks/useWBS';

declare global {
  // eslint-disable-next-line no-var
  var __nsmWbsStore: WBSNode[] | undefined;
}

export function getWbsStore() {
  if (!globalThis.__nsmWbsStore) {
    globalThis.__nsmWbsStore = [
      ...(seedWbsNodes as WBSNode[]),
      ...(generatedWbsNodes as WBSNode[]),
    ];

    const projectIds = Array.from(
      new Set(globalThis.__nsmWbsStore.map((node) => node.projectId)),
    );

    projectIds.forEach((projectId) => {
      normalizeProjectWbsProgress(
        globalThis.__nsmWbsStore!.filter((node) => node.projectId === projectId),
      );
    });
  }

  return globalThis.__nsmWbsStore;
}
