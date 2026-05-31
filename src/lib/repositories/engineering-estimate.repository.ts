import type { EngineeringEstimate } from '@/types/engineering-estimate';

import type { Repository } from './types';

export interface EngineeringEstimateRepository
  extends Repository<EngineeringEstimate> {
  listByProcurementPackage(
    procurementPackageId: string,
  ): Promise<EngineeringEstimate[]>;
}
