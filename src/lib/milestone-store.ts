import seedMilestones from '@/data/milestones.json';
import { generatedMilestones } from '@/lib/generated-project-data';
import type { Milestone } from '@/types/project';

declare global {
  // eslint-disable-next-line no-var
  var __nsmMilestoneStore: Milestone[] | undefined;
}

export function getMilestoneStore() {
  if (!globalThis.__nsmMilestoneStore) {
    globalThis.__nsmMilestoneStore = [
      ...(seedMilestones as Milestone[]),
      ...generatedMilestones,
    ];
  }

  return globalThis.__nsmMilestoneStore;
}
