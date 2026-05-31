import type { CommitteeInspection } from '@/types/committee-inspection';

import type { Repository } from './types';

export interface CommitteeInspectionRepository
  extends Repository<CommitteeInspection> {
  listByWorkPeriod(workPeriodId: string): Promise<CommitteeInspection[]>;
}
