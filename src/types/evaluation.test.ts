import { describe, expect, it } from 'vitest';

import { deriveEvaluationSummary } from './evaluation';

const cats = (...scores: number[]) => scores.map((score) => ({ score }));

describe('deriveEvaluationSummary', () => {
  it('reproduces the seeded proj-005 summary (mean 4.2 → 84% → Very Good)', () => {
    const s = deriveEvaluationSummary(cats(5, 4, 3, 5, 4));
    expect(s.overallScore).toBe(4.2);
    expect(s.percentage).toBe(84);
    expect(s.level).toBe('ดีมาก (Very Good)');
  });

  it('handles empty categories without NaN', () => {
    const s = deriveEvaluationSummary([]);
    expect(s.overallScore).toBe(0);
    expect(s.percentage).toBe(0);
    expect(s.level).toBe('ต้องปรับปรุง (Needs Improvement)');
  });

  it.each([
    { scores: [5, 5], percentage: 100, level: 'ดีเยี่ยม (Excellent)' },
    { scores: [5, 4], percentage: 90, level: 'ดีเยี่ยม (Excellent)' },
    { scores: [4, 4], percentage: 80, level: 'ดีมาก (Very Good)' },
    { scores: [4, 3], percentage: 70, level: 'ดี (Good)' },
    { scores: [3, 3], percentage: 60, level: 'พอใช้ (Fair)' },
    { scores: [3, 2], percentage: 50, level: 'ต้องปรับปรุง (Needs Improvement)' },
  ])('bands $percentage% → $level', ({ scores, percentage, level }) => {
    const s = deriveEvaluationSummary(cats(...scores));
    expect(s.percentage).toBe(percentage);
    expect(s.level).toBe(level);
  });

  it('rounds overallScore to one decimal', () => {
    // mean of [5,4,4] = 4.333… → 4.3
    expect(deriveEvaluationSummary(cats(5, 4, 4)).overallScore).toBe(4.3);
  });
});
