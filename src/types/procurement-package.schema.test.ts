import { describe, expect, it } from 'vitest';

import {
  createProcurementPackageRequestSchema,
  transitionProcurementRequestSchema,
} from './procurement-package.schema';

describe('createProcurementPackageRequestSchema', () => {
  it('accepts a minimal valid body', () => {
    const result = createProcurementPackageRequestSchema.safeParse({
      name: 'จัดซื้อจัดจ้างงานก่อสร้าง (Construction works)',
      budgetCeiling: 5_000_000,
      procurementMethod: 'e_bidding',
    });
    expect(result.success).toBe(true);
  });

  it('rejects missing name', () => {
    const result = createProcurementPackageRequestSchema.safeParse({
      budgetCeiling: 1,
      procurementMethod: 'e_bidding',
    });
    expect(result.success).toBe(false);
  });

  it('rejects negative budgetCeiling', () => {
    const result = createProcurementPackageRequestSchema.safeParse({
      name: 'x',
      budgetCeiling: -1,
      procurementMethod: 'e_bidding',
    });
    expect(result.success).toBe(false);
  });

  it('rejects unknown procurement method', () => {
    const result = createProcurementPackageRequestSchema.safeParse({
      name: 'x',
      budgetCeiling: 1,
      procurementMethod: 'open_bid',
    });
    expect(result.success).toBe(false);
  });

  it('rejects extra fields (strict mode)', () => {
    const result = createProcurementPackageRequestSchema.safeParse({
      name: 'x',
      budgetCeiling: 1,
      procurementMethod: 'e_bidding',
      hijack: 'yes',
    });
    expect(result.success).toBe(false);
  });
});

describe('transitionProcurementRequestSchema', () => {
  it('accepts a valid target state', () => {
    const result = transitionProcurementRequestSchema.safeParse({
      to: 'tor_review',
    });
    expect(result.success).toBe(true);
  });

  it('rejects an unknown target state', () => {
    const result = transitionProcurementRequestSchema.safeParse({ to: 'foo' });
    expect(result.success).toBe(false);
  });

  it('rejects missing `to`', () => {
    const result = transitionProcurementRequestSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});
