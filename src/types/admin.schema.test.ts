import { describe, expect, it } from 'vitest';

import {
  createOrgUnitRequestSchema,
  updateOrgUnitRequestSchema,
} from './admin.schema';

// ---------------------------------------------------------------------------
// PR-17 — Zod schema for the org-unit write boundary, now backed by PR-13's
// `RidOrgUnit` discriminated union.
//
// CLAUDE.md bans `@ts-expect-error`, so wherever the spec calls for proving
// that the union rejects a malformed shape we exercise it through `safeParse`
// at runtime instead of asserting at the type level.
// ---------------------------------------------------------------------------

describe('createOrgUnitRequestSchema — discriminator', () => {
  it('accepts a department payload (no constructionTier)', () => {
    const result = createOrgUnitRequestSchema.safeParse({
      kind: 'department',
      name: 'กรมชลประทาน',
      nameEn: 'Royal Irrigation Department',
      parentId: null,
      costCenter: null,
    });
    expect(result.success).toBe(true);
  });

  it('accepts a construction_office payload WITH constructionTier', () => {
    const result = createOrgUnitRequestSchema.safeParse({
      kind: 'construction_office',
      name: 'สำนักงานก่อสร้าง 1',
      nameEn: 'Construction Office 1',
      parentId: 'ro-1',
      costCenter: 'CC-2001',
      constructionTier: 'large',
    });
    expect(result.success).toBe(true);
  });

  it('accepts construction_office with constructionTier explicitly null', () => {
    const result = createOrgUnitRequestSchema.safeParse({
      kind: 'construction_office',
      name: 'สำนักงานก่อสร้าง 2',
      nameEn: null,
      parentId: 'ro-1',
      costCenter: null,
      constructionTier: null,
    });
    expect(result.success).toBe(true);
  });

  it('REJECTS construction_office that omits constructionTier (runtime predicate, not @ts-expect-error)', () => {
    const result = createOrgUnitRequestSchema.safeParse({
      kind: 'construction_office',
      name: 'สำนักงานก่อสร้างที่ขาดข้อมูล',
      nameEn: null,
      parentId: 'ro-1',
      costCenter: null,
      // constructionTier deliberately absent
    });
    expect(result.success).toBe(false);
  });

  it('REJECTS a non-construction-office payload that carries constructionTier (strict-mode rejection)', () => {
    const result = createOrgUnitRequestSchema.safeParse({
      kind: 'bureau',
      name: 'สำนัก',
      nameEn: 'Bureau',
      parentId: 'dept-root',
      costCenter: null,
      constructionTier: 'large',
    });
    expect(result.success).toBe(false);
  });

  it('REJECTS unknown discriminator values', () => {
    const result = createOrgUnitRequestSchema.safeParse({
      kind: 'unknown_kind',
      name: 'X',
      nameEn: null,
      parentId: null,
      costCenter: null,
    });
    expect(result.success).toBe(false);
  });

  it('REJECTS missing costCenter (it is required, may be null)', () => {
    const result = createOrgUnitRequestSchema.safeParse({
      kind: 'bureau',
      name: 'สำนัก',
      nameEn: null,
      parentId: 'dept-root',
    });
    expect(result.success).toBe(false);
  });

  it('accepts nameEn as null', () => {
    const result = createOrgUnitRequestSchema.safeParse({
      kind: 'om_project',
      name: 'โครงการส่งน้ำและบำรุงรักษา',
      nameEn: null,
      parentId: 'ro-1',
      costCenter: null,
    });
    expect(result.success).toBe(true);
  });

  it('accepts every non-construction-office kind without constructionTier', () => {
    const kinds = [
      'department',
      'bureau',
      'regional_office',
      'provincial_office',
      'om_project',
      'basin',
    ] as const;
    for (const kind of kinds) {
      const result = createOrgUnitRequestSchema.safeParse({
        kind,
        name: `unit-${kind}`,
        nameEn: null,
        parentId: 'dept-root',
        costCenter: null,
      });
      expect(result.success, `kind ${kind} should be accepted`).toBe(true);
    }
  });
});

describe('updateOrgUnitRequestSchema — partial discriminator', () => {
  it('accepts a partial update with no kind change', () => {
    const result = updateOrgUnitRequestSchema.safeParse({
      id: 'dept-002-1',
      updates: { nameEn: 'Project Development (Renamed)' },
    });
    expect(result.success).toBe(true);
  });

  it('accepts a partial update that sets costCenter', () => {
    const result = updateOrgUnitRequestSchema.safeParse({
      id: 'dept-002-1',
      updates: { costCenter: 'CC-9999' },
    });
    expect(result.success).toBe(true);
  });

  it('accepts a construction_office update that includes constructionTier', () => {
    const result = updateOrgUnitRequestSchema.safeParse({
      id: 'ko-1',
      updates: { kind: 'construction_office', constructionTier: 'medium' },
    });
    expect(result.success).toBe(true);
  });

  it('REJECTS a non-construction-office update that smuggles in constructionTier', () => {
    const result = updateOrgUnitRequestSchema.safeParse({
      id: 'dept-002-1',
      updates: { kind: 'bureau', constructionTier: 'small' },
    });
    expect(result.success).toBe(false);
  });

  it('REJECTS missing id', () => {
    const result = updateOrgUnitRequestSchema.safeParse({ updates: {} });
    expect(result.success).toBe(false);
  });
});
