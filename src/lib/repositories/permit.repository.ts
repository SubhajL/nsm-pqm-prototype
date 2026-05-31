import type { Permit } from '@/types/permit';

import type { Repository } from './types';

export interface PermitRepository extends Repository<Permit> {
  listByProject(projectId: string): Promise<Permit[]>;
}
