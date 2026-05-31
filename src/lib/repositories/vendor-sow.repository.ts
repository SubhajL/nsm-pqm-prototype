import type { VendorSow } from '@/types/vendor-sow';

import type { Repository } from './types';

export interface VendorSowRepository extends Repository<VendorSow> {
  listByProject(projectId: string): Promise<VendorSow[]>;
}
