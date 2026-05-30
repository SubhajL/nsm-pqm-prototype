import type { Risk } from '@/types/risk';
import type { Repository } from './types';

export interface RiskRepository extends Repository<Risk> {
  listByProject(projectId: string): Promise<Risk[]>;
}
