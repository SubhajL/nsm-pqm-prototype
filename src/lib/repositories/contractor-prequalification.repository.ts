import type { ContractorPrequalification } from '@/types/contractor-prequalification';

import type { Repository } from './types';

export interface ContractorPrequalificationRepository
  extends Repository<ContractorPrequalification> {
  listByProject(projectId: string): Promise<ContractorPrequalification[]>;
}
