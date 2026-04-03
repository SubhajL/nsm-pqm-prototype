import seedProjects from '@/data/projects.json';
import type { Project } from '@/types/project';

declare global {
  // eslint-disable-next-line no-var
  var __nsmProjectStore: Project[] | undefined;
}

export function getProjectStore() {
  if (!globalThis.__nsmProjectStore) {
    globalThis.__nsmProjectStore = [...(seedProjects as Project[])];
  }

  return globalThis.__nsmProjectStore;
}
