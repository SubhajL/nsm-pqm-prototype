import type { PaymentVoucher } from '@/types/payment-voucher';

import type { Repository } from './types';

export interface PaymentVoucherRepository extends Repository<PaymentVoucher> {
  listByWorkPeriod(workPeriodId: string): Promise<PaymentVoucher[]>;
  /**
   * Convenience for the common "one voucher per period" lookup. Returns
   * the most recently created voucher when more than one exists (e.g.
   * the contract has been re-issued after rejection).
   */
  findByWorkPeriod(workPeriodId: string): Promise<PaymentVoucher | null>;
}
