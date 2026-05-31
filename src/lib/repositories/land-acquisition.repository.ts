import type { LandAcquisitionRecord } from '@/types/land-acquisition';

import type { Repository } from './types';

export interface LandAcquisitionRepository
  extends Repository<LandAcquisitionRecord> {
  listByProject(projectId: string): Promise<LandAcquisitionRecord[]>;
}
