import type { ItSprint } from '@/types/sprint';

import type { Repository } from './types';

export interface ItSprintRepository extends Repository<ItSprint> {
  listByProject(projectId: string): Promise<ItSprint[]>;
}
