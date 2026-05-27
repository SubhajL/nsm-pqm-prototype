import { describe, expect, it } from 'vitest';

import {
  CONTRACTING_MODELS,
  DELIVERY_METHODS,
  PROJECT_CLASSES,
  PROJECT_SIZE_TIERS,
  PROJECT_SIZE_TIER_THRESHOLDS,
  RID_LIFECYCLE_STAGES,
  RID_ORG_UNIT_KINDS,
  classifyProjectSize,
  type ContractingModel,
  type DeliveryMethod,
  type ProjectClass,
  type ProjectSizeTier,
  type RidLifecycleStage,
  type RidOrgUnit,
  type RidOrgUnitKind,
} from './vocabulary';

// ---------------------------------------------------------------------------
// classifyProjectSize boundary tests.
// Stakeholder-confirmed thresholds (2026-05-28):
//   small:  totalBudgetTHB <= 50_000_000
//   medium: 50_000_000 < totalBudgetTHB <= 500_000_000
//   large:  totalBudgetTHB > 500_000_000
// ---------------------------------------------------------------------------

describe('classifyProjectSize — boundaries', () => {
  it('returns small for budgets strictly below the small_max threshold', () => {
    expect(classifyProjectSize(40_000_000)).toBe('small');
  });

  it('returns small at the small_max boundary (<= 50M THB)', () => {
    expect(classifyProjectSize(50_000_000)).toBe('small');
  });

  it('returns medium just above the small_max boundary', () => {
    expect(classifyProjectSize(50_000_001)).toBe('medium');
  });

  it('returns medium at the medium_max boundary (<= 500M THB)', () => {
    expect(classifyProjectSize(500_000_000)).toBe('medium');
  });

  it('returns large just above the medium_max boundary', () => {
    expect(classifyProjectSize(500_000_001)).toBe('large');
  });

  it('returns large for very large budgets', () => {
    expect(classifyProjectSize(10_000_000_000)).toBe('large');
  });

  it('treats zero budget as small', () => {
    expect(classifyProjectSize(0)).toBe('small');
  });

  it('exposes the stakeholder-confirmed thresholds as constants', () => {
    expect(PROJECT_SIZE_TIER_THRESHOLDS.small_max).toBe(50_000_000);
    expect(PROJECT_SIZE_TIER_THRESHOLDS.medium_max).toBe(500_000_000);
  });
});

// ---------------------------------------------------------------------------
// Enum-list completeness.
// Each `*_VALUES` constant must enumerate every member of its companion
// union type. Type-level assignability checks pin this at compile time;
// runtime length/uniqueness checks catch accidental duplicates.
// ---------------------------------------------------------------------------

describe('vocabulary constants — completeness', () => {
  it('PROJECT_CLASSES exhaustively enumerates ProjectClass', () => {
    const sample: ProjectClass = PROJECT_CLASSES[0];
    expect(sample).toBeDefined();
    expect(PROJECT_CLASSES).toEqual([
      'construction',
      'it',
      'consulting',
      'research',
      'maintenance',
    ]);
    expect(new Set(PROJECT_CLASSES).size).toBe(PROJECT_CLASSES.length);
  });

  it('DELIVERY_METHODS exhaustively enumerates DeliveryMethod', () => {
    const sample: DeliveryMethod = DELIVERY_METHODS[0];
    expect(sample).toBeDefined();
    expect(DELIVERY_METHODS).toEqual([
      'in_house',
      'outsourced',
      'consultant_supervised',
    ]);
    expect(new Set(DELIVERY_METHODS).size).toBe(DELIVERY_METHODS.length);
  });

  it('CONTRACTING_MODELS exhaustively enumerates ContractingModel', () => {
    const sample: ContractingModel = CONTRACTING_MODELS[0];
    expect(sample).toBeDefined();
    expect(CONTRACTING_MODELS).toEqual([
      'lump_sum',
      'unit_price',
      'cost_plus',
      'design_build',
    ]);
    expect(new Set(CONTRACTING_MODELS).size).toBe(CONTRACTING_MODELS.length);
  });

  it('PROJECT_SIZE_TIERS exhaustively enumerates ProjectSizeTier', () => {
    const sample: ProjectSizeTier = PROJECT_SIZE_TIERS[0];
    expect(sample).toBeDefined();
    expect(PROJECT_SIZE_TIERS).toEqual(['small', 'medium', 'large']);
    expect(new Set(PROJECT_SIZE_TIERS).size).toBe(PROJECT_SIZE_TIERS.length);
  });

  it('RID_LIFECYCLE_STAGES exhaustively enumerates RidLifecycleStage', () => {
    const sample: RidLifecycleStage = RID_LIFECYCLE_STAGES[0];
    expect(sample).toBeDefined();
    expect(RID_LIFECYCLE_STAGES).toEqual([
      'planning',
      'land_acquisition',
      'survey_design',
      'procurement',
      'construction',
      'handover',
      'om',
    ]);
    expect(RID_LIFECYCLE_STAGES).toHaveLength(7);
    expect(new Set(RID_LIFECYCLE_STAGES).size).toBe(RID_LIFECYCLE_STAGES.length);
  });

  it('RID_ORG_UNIT_KINDS exhaustively enumerates RidOrgUnitKind', () => {
    const sample: RidOrgUnitKind = RID_ORG_UNIT_KINDS[0];
    expect(sample).toBeDefined();
    expect(RID_ORG_UNIT_KINDS).toEqual([
      'department',
      'bureau',
      'regional_office',
      'construction_office',
      'provincial_office',
      'om_project',
      'basin',
    ]);
    expect(new Set(RID_ORG_UNIT_KINDS).size).toBe(RID_ORG_UNIT_KINDS.length);
  });
});

// ---------------------------------------------------------------------------
// Exhaustiveness pins (compile-time):
// Each helper switch covers every member of its union. If a future PR adds
// a new value to the union without updating these helpers, TypeScript will
// flag the missing case at compile time (the `_exhaustive: never` line).
// ---------------------------------------------------------------------------

function describeProjectClass(value: ProjectClass): string {
  switch (value) {
    case 'construction':
    case 'it':
    case 'consulting':
    case 'research':
    case 'maintenance':
      return value;
    default: {
      const _exhaustive: never = value;
      return _exhaustive;
    }
  }
}

function describeDeliveryMethod(value: DeliveryMethod): string {
  switch (value) {
    case 'in_house':
    case 'outsourced':
    case 'consultant_supervised':
      return value;
    default: {
      const _exhaustive: never = value;
      return _exhaustive;
    }
  }
}

function describeRidLifecycleStage(value: RidLifecycleStage): string {
  switch (value) {
    case 'planning':
    case 'land_acquisition':
    case 'survey_design':
    case 'procurement':
    case 'construction':
    case 'handover':
    case 'om':
      return value;
    default: {
      const _exhaustive: never = value;
      return _exhaustive;
    }
  }
}

describe('vocabulary — exhaustiveness helpers compile and run', () => {
  it('every ProjectClass value round-trips through the exhaustiveness helper', () => {
    for (const value of PROJECT_CLASSES) {
      expect(describeProjectClass(value)).toBe(value);
    }
  });

  it('every DeliveryMethod value round-trips through the exhaustiveness helper', () => {
    for (const value of DELIVERY_METHODS) {
      expect(describeDeliveryMethod(value)).toBe(value);
    }
  });

  it('every RidLifecycleStage value round-trips through the exhaustiveness helper', () => {
    for (const value of RID_LIFECYCLE_STAGES) {
      expect(describeRidLifecycleStage(value)).toBe(value);
    }
  });
});

// ---------------------------------------------------------------------------
// RidOrgUnit discriminated-union behavior.
//   - `construction_office` REQUIRES a `constructionTier` field
//   - any other kind REJECTS the field (TypeScript error at construction)
// ---------------------------------------------------------------------------

describe('RidOrgUnit — discriminator', () => {
  it('accepts construction_office with constructionTier', () => {
    const unit: RidOrgUnit = {
      id: 'ko-1',
      kind: 'construction_office',
      name: 'สำนักงานก่อสร้าง 1',
      nameEn: 'Construction Office 1',
      parentId: 'ro-1',
      costCenter: null,
      constructionTier: 'large',
    };
    expect(unit.kind).toBe('construction_office');
    if (unit.kind === 'construction_office') {
      // narrowing exposes constructionTier
      expect(unit.constructionTier).toBe('large');
    }
  });

  it('accepts construction_office with constructionTier = null (unknown sizing)', () => {
    const unit: RidOrgUnit = {
      id: 'ko-2',
      kind: 'construction_office',
      name: 'สำนักงานก่อสร้าง 2',
      nameEn: null,
      parentId: 'ro-1',
      costCenter: null,
      constructionTier: null,
    };
    expect(unit.kind).toBe('construction_office');
  });

  it('narrows to expose constructionTier ONLY on construction_office', () => {
    // This test pins the discriminator contract at runtime. The actual
    // compile-time rejection of either (a) a `construction_office` literal
    // missing `constructionTier` or (b) a non-`construction_office` literal
    // carrying `constructionTier` is enforced by every call site that
    // assigns to `RidOrgUnit`. (The project bans `@ts-expect-error` per
    // CLAUDE.md, so we exercise the type via narrowing checks here.)
    const units: RidOrgUnit[] = [
      {
        id: 'dept',
        kind: 'department',
        name: 'กรม',
        nameEn: 'Department',
        parentId: null,
        costCenter: null,
      },
      {
        id: 'ko',
        kind: 'construction_office',
        name: 'สำนักงานก่อสร้าง',
        nameEn: null,
        parentId: 'ro',
        costCenter: null,
        constructionTier: 'medium',
      },
    ];

    const withTier = units.filter(
      (u): u is Extract<RidOrgUnit, { kind: 'construction_office' }> =>
        u.kind === 'construction_office',
    );
    const withoutTier = units.filter((u) => u.kind !== 'construction_office');

    expect(withTier).toHaveLength(1);
    expect(withTier[0].constructionTier).toBe('medium');
    expect(withoutTier).toHaveLength(1);
    // `constructionTier` is not a property on the non-construction-office
    // branch of the union — narrowing makes the property inaccessible.
    expect(Object.prototype.hasOwnProperty.call(withoutTier[0], 'constructionTier')).toBe(false);
  });

  it('builds a non-construction-office org unit without the tier qualifier', () => {
    const dept: RidOrgUnit = {
      id: 'rid',
      kind: 'department',
      name: 'กรมชลประทาน',
      nameEn: 'Royal Irrigation Department',
      parentId: null,
      costCenter: null,
    };
    expect(dept.kind).toBe('department');
    expect(dept.parentId).toBeNull();
  });
});
