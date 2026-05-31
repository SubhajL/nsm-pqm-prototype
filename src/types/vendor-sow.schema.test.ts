/**
 * PR-30a — Vendor SOW Zod schema tests.
 */

import { describe, expect, it } from 'vitest';

import {
  createVendorSowRequestSchema,
  transitionVendorSowRequestSchema,
} from './vendor-sow.schema';

describe('createVendorSowRequestSchema', () => {
  const valid = {
    phase: 'Phase 1 - SRS',
    scopeSummary: 'Software Requirements Specification deliverable.',
    uatCriteria: '- All functional reqs traced.\n- Sign-off by RID PMO.',
    warrantyMonths: 12,
    contractId: 'ct-123',
    notes: '',
  };

  it('accepts a well-formed body', () => {
    const result = createVendorSowRequestSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });

  it('accepts a body without optional fields (contractId, warrantyMonths, notes)', () => {
    const result = createVendorSowRequestSchema.safeParse({
      phase: 'Phase 2',
      scopeSummary: 'Build',
      uatCriteria: 'tbd',
    });
    expect(result.success).toBe(true);
  });

  it('rejects an empty phase', () => {
    const result = createVendorSowRequestSchema.safeParse({
      ...valid,
      phase: '',
    });
    expect(result.success).toBe(false);
  });

  it('rejects a missing scopeSummary', () => {
    const { scopeSummary: _drop, ...rest } = valid;
    void _drop;
    const result = createVendorSowRequestSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });

  it('rejects negative warrantyMonths', () => {
    const result = createVendorSowRequestSchema.safeParse({
      ...valid,
      warrantyMonths: -1,
    });
    expect(result.success).toBe(false);
  });

  it('rejects unknown extra keys (strict mode)', () => {
    const result = createVendorSowRequestSchema.safeParse({
      ...valid,
      bogusField: 'x',
    });
    expect(result.success).toBe(false);
  });
});

describe('transitionVendorSowRequestSchema', () => {
  it('accepts a valid target SOW state', () => {
    const result = transitionVendorSowRequestSchema.safeParse({
      targetState: 'agreed',
    });
    expect(result.success).toBe(true);
  });

  it('rejects an unknown target state', () => {
    const result = transitionVendorSowRequestSchema.safeParse({
      targetState: 'wibble',
    });
    expect(result.success).toBe(false);
  });

  it('rejects extra keys (strict mode)', () => {
    const result = transitionVendorSowRequestSchema.safeParse({
      targetState: 'agreed',
      bogus: true,
    });
    expect(result.success).toBe(false);
  });
});
