/**
 * PR-30b — GFMIS cost-center-mapping unit tests.
 */
import { describe, expect, it } from 'vitest';

import type { RidOrgUnit } from '@/types/rid/vocabulary';

import { gfmisCostCenterFor } from './cost-center-mapping';

function makeUnit(overrides: Partial<RidOrgUnit> = {}): RidOrgUnit {
  return {
    id: 'unit-1',
    kind: 'bureau',
    name: 'สำนักทดสอบ',
    nameEn: 'Test Bureau',
    parentId: null,
    costCenter: '1206000000',
    ...overrides,
  } as RidOrgUnit;
}

describe('gfmisCostCenterFor', () => {
  it('returns the cost center verbatim when the unit declares one', () => {
    const unit = makeUnit({ costCenter: '1206000000' });
    expect(gfmisCostCenterFor(unit)).toBe('1206000000');
  });

  it('returns null when the unit has no cost center on file', () => {
    const unit = makeUnit({ costCenter: null });
    expect(gfmisCostCenterFor(unit)).toBeNull();
  });

  it('trims surrounding whitespace and returns the canonical code', () => {
    const unit = makeUnit({ costCenter: '  1206000000  ' });
    expect(gfmisCostCenterFor(unit)).toBe('1206000000');
  });

  it('returns null when the trimmed code is empty', () => {
    const unit = makeUnit({ costCenter: '   ' });
    expect(gfmisCostCenterFor(unit)).toBeNull();
  });

  it.each([
    'abcd000000',
    '12060000', // too short
    '12060000001', // too long
  ])('returns null for non-canonical code %p', (raw) => {
    const unit = makeUnit({ costCenter: raw });
    expect(gfmisCostCenterFor(unit)).toBeNull();
  });

  it('is deterministic for the same input', () => {
    const unit = makeUnit({ costCenter: '1206000000' });
    const a = gfmisCostCenterFor(unit);
    const b = gfmisCostCenterFor(unit);
    expect(a).toBe(b);
  });
});
