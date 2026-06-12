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
  it('accepts the canonical { targetState } body', () => {
    const result = transitionProcurementRequestSchema.safeParse({
      targetState: 'tor_review',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.targetState).toBe('tor_review');
    }
  });

  it('accepts the legacy { to } body and normalizes to targetState', () => {
    const result = transitionProcurementRequestSchema.safeParse({
      to: 'tor_review',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.targetState).toBe('tor_review');
    }
  });

  it('rejects an unknown target state under both spellings', () => {
    expect(transitionProcurementRequestSchema.safeParse({ to: 'foo' }).success).toBe(
      false,
    );
    expect(
      transitionProcurementRequestSchema.safeParse({ targetState: 'foo' }).success,
    ).toBe(false);
  });

  it('rejects a body carrying BOTH spellings (ambiguous)', () => {
    const result = transitionProcurementRequestSchema.safeParse({
      to: 'tor_review',
      targetState: 'tor_review',
    });
    expect(result.success).toBe(false);
  });

  it('rejects an empty body', () => {
    const result = transitionProcurementRequestSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});
