import { describe, expect, it } from 'vitest';

import {
  createWorkPeriodRequestSchema,
  transitionWorkPeriodRequestSchema,
} from './work-period.schema';

describe('createWorkPeriodRequestSchema', () => {
  const minimalValid = {
    number: 1,
    title: 'งวดที่ 1',
    plannedStartDate: '2026-06-01',
    plannedEndDate: '2026-06-30',
    amount: 1_000_000,
    percentage: 10,
  };

  it('accepts a minimal valid body', () => {
    const result = createWorkPeriodRequestSchema.safeParse(minimalValid);
    expect(result.success).toBe(true);
  });

  it('rejects negative percentage', () => {
    const result = createWorkPeriodRequestSchema.safeParse({
      ...minimalValid,
      percentage: -1,
    });
    expect(result.success).toBe(false);
  });

  it('rejects percentage > 100', () => {
    const result = createWorkPeriodRequestSchema.safeParse({
      ...minimalValid,
      percentage: 101,
    });
    expect(result.success).toBe(false);
  });

  it('rejects negative amount', () => {
    const result = createWorkPeriodRequestSchema.safeParse({
      ...minimalValid,
      amount: -1,
    });
    expect(result.success).toBe(false);
  });

  it('rejects non-positive number', () => {
    const result = createWorkPeriodRequestSchema.safeParse({
      ...minimalValid,
      number: 0,
    });
    expect(result.success).toBe(false);
  });

  it('rejects empty title', () => {
    const result = createWorkPeriodRequestSchema.safeParse({
      ...minimalValid,
      title: '',
    });
    expect(result.success).toBe(false);
  });

  it('rejects unknown extra fields (strict mode)', () => {
    const result = createWorkPeriodRequestSchema.safeParse({
      ...minimalValid,
      sneaky: 'value',
    });
    expect(result.success).toBe(false);
  });

  it('defaults deliverables to []', () => {
    const result = createWorkPeriodRequestSchema.safeParse(minimalValid);
    if (!result.success) throw new Error('expected success');
    expect(result.data.deliverables).toEqual([]);
  });
});

describe('transitionWorkPeriodRequestSchema', () => {
  it('accepts any valid WorkPeriodState', () => {
    const result = transitionWorkPeriodRequestSchema.safeParse({
      targetState: 'in_progress',
    });
    expect(result.success).toBe(true);
  });

  it('rejects unknown state', () => {
    const result = transitionWorkPeriodRequestSchema.safeParse({
      targetState: 'magic_state',
    });
    expect(result.success).toBe(false);
  });

  it('rejects missing targetState', () => {
    const result = transitionWorkPeriodRequestSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});
