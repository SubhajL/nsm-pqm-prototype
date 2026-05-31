import { describe, expect, it } from 'vitest';

import { createContractAmendmentRequestSchema } from './contract-amendment.schema';

describe('createContractAmendmentRequestSchema', () => {
  it('accepts a valid amendment body', () => {
    const result = createContractAmendmentRequestSchema.safeParse({
      amendmentNumber: 1,
      amendedAt: '2026-06-15',
      amountDelta: 250_000,
      scheduleDeltaDays: 14,
      reason: 'เพิ่มงาน X / Additional scope X',
      approvedBy: 'user-002',
    });
    expect(result.success).toBe(true);
  });

  it('accepts negative deltas (deductive + early termination)', () => {
    const result = createContractAmendmentRequestSchema.safeParse({
      amendmentNumber: 2,
      amendedAt: '2026-07-01',
      amountDelta: -100_000,
      scheduleDeltaDays: -7,
      reason: 'reduce scope',
      approvedBy: 'user-002',
    });
    expect(result.success).toBe(true);
  });

  it('rejects amendmentNumber < 1', () => {
    const result = createContractAmendmentRequestSchema.safeParse({
      amendmentNumber: 0,
      amendedAt: '2026-06-15',
      amountDelta: 0,
      scheduleDeltaDays: 0,
      reason: 'r',
      approvedBy: 'u',
    });
    expect(result.success).toBe(false);
  });

  it('rejects non-integer scheduleDeltaDays', () => {
    const result = createContractAmendmentRequestSchema.safeParse({
      amendmentNumber: 1,
      amendedAt: '2026-06-15',
      amountDelta: 0,
      scheduleDeltaDays: 1.5,
      reason: 'r',
      approvedBy: 'u',
    });
    expect(result.success).toBe(false);
  });

  it('rejects missing reason', () => {
    const result = createContractAmendmentRequestSchema.safeParse({
      amendmentNumber: 1,
      amendedAt: '2026-06-15',
      amountDelta: 0,
      scheduleDeltaDays: 0,
      approvedBy: 'u',
    });
    expect(result.success).toBe(false);
  });
});
