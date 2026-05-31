import type { ProcurementPackage } from '@/types/procurement-package';

import type { Repository } from './types';

export interface ProcurementPackageRepository
  extends Repository<ProcurementPackage> {
  listByProject(projectId: string): Promise<ProcurementPackage[]>;
}
