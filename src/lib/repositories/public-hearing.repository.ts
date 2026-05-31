import type { PublicHearing } from '@/types/public-hearing';

import type { Repository } from './types';

export interface PublicHearingRepository extends Repository<PublicHearing> {
  listByProject(projectId: string): Promise<PublicHearing[]>;
}
