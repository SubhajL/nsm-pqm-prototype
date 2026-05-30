import type { BOQItem } from '@/hooks/useBOQ';
import type { Repository } from './types';

export interface BoqRepository extends Repository<BOQItem> {
  listByWbs(wbsId: string): Promise<BOQItem[]>;
}
