import type { AwardedContract } from '@/types/awarded-contract';

import type { Repository } from './types';

export interface AwardedContractRepository extends Repository<AwardedContract> {
  listByProject(projectId: string): Promise<AwardedContract[]>;
  listByProcurementPackage(
    procurementPackageId: string,
  ): Promise<AwardedContract[]>;
}
