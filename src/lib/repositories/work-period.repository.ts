import type { WorkPeriod } from '@/types/work-period';

import type { Repository } from './types';

export interface WorkPeriodRepository extends Repository<WorkPeriod> {
  listByProject(projectId: string): Promise<WorkPeriod[]>;
}
