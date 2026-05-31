import { beforeEach, describe, expect, it } from 'vitest';

import type { PaymentVoucher } from '@/types/payment-voucher';

import type { PaymentVoucherRepository } from '../../payment-voucher.repository';

export function runPaymentVoucherRepositoryContract(
  makeRepo: () =>
    | Promise<PaymentVoucherRepository>
    | PaymentVoucherRepository,
) {
  describe('PaymentVoucherRepository contract', () => {
    let repo: PaymentVoucherRepository;

    beforeEach(async () => {
      repo = await makeRepo();
    });

    function sample(id: string, workPeriodId = 'wp-x'): PaymentVoucher {
      return {
        id,
        workPeriodId,
        state: 'draft',
        requestedAmount: 1_250_000,
        approvedAmount: null,
        voucherNumber: null,
        paidAt: null,
        notes: '',
      };
    }

    it('listByWorkPeriod filters by workPeriodId', async () => {
      await repo.create(sample('pv-c-1', 'wp-a'));
      await repo.create(sample('pv-c-2', 'wp-b'));
      const onlyA = await repo.listByWorkPeriod('wp-a');
      expect(onlyA).toHaveLength(1);
      expect(onlyA[0].workPeriodId).toBe('wp-a');
    });

    it('findByWorkPeriod returns null when no voucher exists', async () => {
      expect(await repo.findByWorkPeriod('wp-unknown')).toBeNull();
    });

    it('findByWorkPeriod returns the row when exactly one exists', async () => {
      await repo.create(sample('pv-c-3', 'wp-a'));
      const found = await repo.findByWorkPeriod('wp-a');
      expect(found?.id).toBe('pv-c-3');
    });

    it('CRUD round-trip with state transition to approved', async () => {
      const pv = sample('pv-c-4');
      await repo.create(pv);
      expect((await repo.findById(pv.id))?.state).toBe('draft');

      const patched = await repo.update(pv.id, {
        state: 'approved',
        approvedAmount: 1_200_000,
        voucherNumber: 'V-2026-001',
      });
      expect(patched?.state).toBe('approved');
      expect(patched?.approvedAmount).toBe(1_200_000);
      expect(patched?.voucherNumber).toBe('V-2026-001');

      await repo.delete(pv.id);
      expect(await repo.findById(pv.id)).toBeNull();
    });

    it('update returns null for unknown id', async () => {
      const result = await repo.update('pv-missing', { state: 'approved' });
      expect(result).toBeNull();
    });

    it('list returns every persisted voucher', async () => {
      await repo.create(sample('pv-c-5', 'wp-a'));
      await repo.create(sample('pv-c-6', 'wp-b'));
      const all = await repo.list();
      expect(all.map((v) => v.id).sort()).toEqual(['pv-c-5', 'pv-c-6']);
    });
  });
}
