import { describe, expect, it } from 'vitest';

import {
  createPaymentVoucherRequestSchema,
  patchPaymentVoucherRequestSchema,
} from './payment-voucher.schema';

describe('createPaymentVoucherRequestSchema', () => {
  it('accepts a positive requestedAmount', () => {
    const result = createPaymentVoucherRequestSchema.safeParse({
      requestedAmount: 1_000_000,
    });
    expect(result.success).toBe(true);
  });

  it('rejects zero requestedAmount', () => {
    const result = createPaymentVoucherRequestSchema.safeParse({
      requestedAmount: 0,
    });
    expect(result.success).toBe(false);
  });

  it('rejects negative requestedAmount', () => {
    const result = createPaymentVoucherRequestSchema.safeParse({
      requestedAmount: -10,
    });
    expect(result.success).toBe(false);
  });

  it('rejects unknown extra fields (strict mode)', () => {
    const result = createPaymentVoucherRequestSchema.safeParse({
      requestedAmount: 100,
      voucherNumber: 'V-001',
    });
    expect(result.success).toBe(false);
  });
});

describe('patchPaymentVoucherRequestSchema', () => {
  it('accepts a simple state update', () => {
    const result = patchPaymentVoucherRequestSchema.safeParse({
      state: 'submitted',
    });
    expect(result.success).toBe(true);
  });

  it('accepts approved + approvedAmount + voucherNumber', () => {
    const result = patchPaymentVoucherRequestSchema.safeParse({
      state: 'approved',
      approvedAmount: 950_000,
      voucherNumber: 'V-2026-001',
    });
    expect(result.success).toBe(true);
  });

  it('rejects negative approvedAmount', () => {
    const result = patchPaymentVoucherRequestSchema.safeParse({
      state: 'approved',
      approvedAmount: -1,
    });
    expect(result.success).toBe(false);
  });

  it('rejects empty voucherNumber', () => {
    const result = patchPaymentVoucherRequestSchema.safeParse({
      state: 'approved',
      voucherNumber: '',
    });
    expect(result.success).toBe(false);
  });

  it('rejects missing state', () => {
    const result = patchPaymentVoucherRequestSchema.safeParse({
      approvedAmount: 100,
    });
    expect(result.success).toBe(false);
  });
});
