import { describe, expect, it } from 'vitest';

import { toExportRows } from './pmqa-export';
import type { PmqaScore } from './pmqa-types';

const sampleScore: PmqaScore = {
  generatedAt: '2026-05-31T00:00:00.000Z',
  scope: 'portfolio',
  overallScore: 3.5,
  categoryAverages: {
    category_2_strategy: 4,
    category_6_process: 3,
    category_7_results: 3.5,
  },
  indicators: [
    {
      key: 'on_time_percent',
      category: 'category_7_results',
      label: 'เปอร์เซ็นต์โครงการตรงกำหนด (On Time %)',
      value: 87.5,
      unit: 'percent',
      score: 4,
      benchmark: 90,
      rationale: 'ทดสอบ',
    },
    {
      key: 'strategy_alignment_percent',
      category: 'category_2_strategy',
      label: 'การจัดวางยุทธศาสตร์ (Strategy Alignment %)',
      value: 100,
      unit: 'percent',
      score: 5,
      rationale: 'ทดสอบ',
    },
    {
      key: 'lifecycle_stage_progression',
      category: 'category_6_process',
      label: 'อัตราการเปลี่ยนสถานะ (Lifecycle Stage Progression)',
      value: 0.6,
      unit: 'ratio',
      score: 3,
      rationale: 'ทดสอบ',
    },
  ],
};

describe('toExportRows', () => {
  it('returns one row per indicator', () => {
    const rows = toExportRows(sampleScore);
    expect(rows.length).toBe(sampleScore.indicators.length);
  });

  it('orders rows by category 2 → 6 → 7 (audit-friendly)', () => {
    const rows = toExportRows(sampleScore);
    // category 2 row(s) come first, then 6, then 7
    const categories = rows.map((r) => r.category);
    const cat2Index = categories.findIndex((c) => c.includes('Strategic') || c.includes('ยุทธศาสตร์'));
    const cat6Index = categories.findIndex((c) => c.includes('Process') || c.includes('กระบวนการ'));
    const cat7Index = categories.findIndex((c) => c.includes('Results') || c.includes('ผลลัพธ์'));
    expect(cat2Index).toBeGreaterThanOrEqual(0);
    expect(cat6Index).toBeGreaterThan(cat2Index);
    expect(cat7Index).toBeGreaterThan(cat6Index);
  });

  it('formats percent values with a trailing % and one decimal place', () => {
    const rows = toExportRows(sampleScore);
    const onTime = rows.find((r) => r.indicatorKey === 'on_time_percent')!;
    expect(onTime.value).toBe('87.5%');
  });

  it('formats ratio values with two decimal places (no suffix)', () => {
    const rows = toExportRows(sampleScore);
    const progression = rows.find((r) => r.indicatorKey === 'lifecycle_stage_progression')!;
    expect(progression.value).toBe('0.60');
  });

  it('renders missing benchmark as "—" placeholder', () => {
    const rows = toExportRows(sampleScore);
    const alignment = rows.find((r) => r.indicatorKey === 'strategy_alignment_percent')!;
    expect(alignment.benchmark).toBe('—');
  });

  it('renders provided benchmark with same unit formatting', () => {
    const rows = toExportRows(sampleScore);
    const onTime = rows.find((r) => r.indicatorKey === 'on_time_percent')!;
    expect(onTime.benchmark).toBe('90.0%');
  });

  it('label is preserved verbatim (bilingual)', () => {
    const rows = toExportRows(sampleScore);
    const onTime = rows.find((r) => r.indicatorKey === 'on_time_percent')!;
    expect(onTime.label).toBe('เปอร์เซ็นต์โครงการตรงกำหนด (On Time %)');
  });

  it('score is forwarded as a number', () => {
    const rows = toExportRows(sampleScore);
    rows.forEach((r) => expect(typeof r.score).toBe('number'));
  });
});
