import { describe, expect, it } from 'vitest';

import { clampStepIndex, getNextButtonLabel } from './wizard-helpers';

describe('getNextButtonLabel', () => {
  it('returns ถัดไป (Next) when current is before the final step', () => {
    expect(getNextButtonLabel({ current: 0, total: 4 })).toBe('ถัดไป (Next)');
    expect(getNextButtonLabel({ current: 2, total: 4 })).toBe('ถัดไป (Next)');
  });

  it('returns บันทึก (Submit) on the final step', () => {
    expect(getNextButtonLabel({ current: 3, total: 4 })).toBe('บันทึก (Submit)');
  });

  it('returns Submit when current somehow exceeds total-1', () => {
    // Defensive: shouldn't happen in practice, but guards against off-by-one.
    expect(getNextButtonLabel({ current: 99, total: 4 })).toBe('บันทึก (Submit)');
  });
});

describe('clampStepIndex', () => {
  it('returns the input when within bounds', () => {
    expect(clampStepIndex(0, 4)).toBe(0);
    expect(clampStepIndex(2, 4)).toBe(2);
    expect(clampStepIndex(3, 4)).toBe(3);
  });

  it('clamps negative inputs to 0', () => {
    expect(clampStepIndex(-1, 4)).toBe(0);
    expect(clampStepIndex(-99, 4)).toBe(0);
  });

  it('clamps above-max inputs to total-1', () => {
    expect(clampStepIndex(4, 4)).toBe(3);
    expect(clampStepIndex(99, 4)).toBe(3);
  });

  it('returns 0 for non-finite or zero-total', () => {
    expect(clampStepIndex(NaN, 4)).toBe(0);
    expect(clampStepIndex(Infinity, 4)).toBe(3);
    expect(clampStepIndex(2, 0)).toBe(0);
  });
});
