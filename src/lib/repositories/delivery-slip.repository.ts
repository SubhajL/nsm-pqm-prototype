import type { DeliverySlip } from '@/types/delivery-slip';

import type { Repository } from './types';

export interface DeliverySlipRepository extends Repository<DeliverySlip> {
  listByWorkPeriod(workPeriodId: string): Promise<DeliverySlip[]>;
}
