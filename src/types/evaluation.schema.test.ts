import { describe, expect, it } from 'vitest';

import { upsertEvaluationRequestSchema } from './evaluation.schema';

const valid = {
  evaluatedBy: 'สมชาย ก.',
  evaluatedAt: '2026-09-15',
  categories: [
    { name: 'ความสำเร็จ', nameEn: 'Achievement', score: 5, note: 'ดี' },
    { name: 'งบประมาณ', nameEn: 'Budget', score: 4, note: '' },
  ],
  recommendation: 'ควรวางแผนล่วงหน้า',
};

describe('upsertEvaluationRequestSchema', () => {
  it('accepts a well-formed upsert request', () => {
    expect(upsertEvaluationRequestSchema.safeParse(valid).success).toBe(true);
  });

  it('rejects server-derived fields (overallScore/percentage/level)', () => {
    expect(
      upsertEvaluationRequestSchema.safeParse({ ...valid, overallScore: 4.2 }).success,
    ).toBe(false);
    expect(
      upsertEvaluationRequestSchema.safeParse({ ...valid, percentage: 84 }).success,
    ).toBe(false);
    expect(
      upsertEvaluationRequestSchema.safeParse({ ...valid, level: 'hacked' }).success,
    ).toBe(false);
  });

  it('rejects scores outside 1–5 and non-integers', () => {
    const bad = (score: number) => ({
      ...valid,
      categories: [{ name: 'x', nameEn: 'x', score, note: '' }],
    });
    expect(upsertEvaluationRequestSchema.safeParse(bad(0)).success).toBe(false);
    expect(upsertEvaluationRequestSchema.safeParse(bad(6)).success).toBe(false);
    expect(upsertEvaluationRequestSchema.safeParse(bad(3.5)).success).toBe(false);
  });

  it('rejects an empty category list', () => {
    expect(
      upsertEvaluationRequestSchema.safeParse({ ...valid, categories: [] }).success,
    ).toBe(false);
  });
});
