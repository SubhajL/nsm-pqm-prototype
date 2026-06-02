import { describe, expect, it } from 'vitest';

import {
  buildPortfolioFreshness,
  computeKpiDelta,
  computeRatioKpiDelta,
  formatFreshnessLabel,
  getMostRecentProjectUpdatedAt,
} from './dashboard-kpi-context';
import type { Project } from '@/types/project';

function projectWithHistory(id: string, history: string[]): Project {
  // Cast through unknown — only `lifecycleStageHistory` is read by these
  // helpers; the other Project fields are irrelevant to the contract.
  return {
    id,
    lifecycleStageHistory: history.map((enteredAt, index) => ({
      id: `${id}-stage-${index}`,
      stage: 'planning',
      enteredAt,
      enteredBy: 'tester',
    })),
  } as unknown as Project;
}

describe('computeKpiDelta', () => {
  it('renders positive delta with plus sign + positive tone (higher is better)', () => {
    const result = computeKpiDelta(12, 10);
    expect(result.label.startsWith('+2')).toBe(true);
    expect(result.tone).toBe('positive');
    expect(result.rawDelta).toBe(2);
  });

  it('renders negative delta with minus sign + negative tone (higher is better)', () => {
    const result = computeKpiDelta(8, 10);
    expect(result.label.startsWith('−2')).toBe(true);
    expect(result.tone).toBe('negative');
    expect(result.rawDelta).toBe(-2);
  });

  it('inverts tone when direction = lower_is_better (eg delayed count)', () => {
    // Delayed count went from 5 → 3: rawDelta = -2, but that's GOOD.
    const result = computeKpiDelta(3, 5, { direction: 'lower_is_better' });
    expect(result.tone).toBe('positive');
    expect(result.rawDelta).toBe(-2);
  });

  it('returns neutral tone when comparison is missing', () => {
    const result = computeKpiDelta(12, null);
    expect(result.tone).toBe('neutral');
    expect(result.label).toMatch(/No comparison/);
  });

  it('returns neutral tone + 0 when comparison equals current', () => {
    const result = computeKpiDelta(7, 7);
    expect(result.tone).toBe('neutral');
    expect(result.rawDelta).toBe(0);
  });

  it('honours custom bilingual comparison label', () => {
    const result = computeKpiDelta(12, 10, { comparisonLabel: '(vs last month)' });
    expect(result.label).toMatch(/\(vs last month\)$/);
  });
});

describe('computeRatioKpiDelta', () => {
  it('formats a positive delta with 2-decimal precision + positive tone', () => {
    const result = computeRatioKpiDelta(1.08, 1.0);
    expect(result.label.startsWith('+0.08')).toBe(true);
    expect(result.tone).toBe('positive');
    expect(result.rawDelta).toBeCloseTo(0.08, 2);
  });

  it('formats a negative delta with proper minus sign + negative tone', () => {
    const result = computeRatioKpiDelta(0.92, 1.0);
    expect(result.label.startsWith('−0.08')).toBe(true);
    expect(result.tone).toBe('negative');
    expect(result.rawDelta).toBeCloseTo(-0.08, 2);
  });

  it('returns neutral tone when current equals baseline', () => {
    const result = computeRatioKpiDelta(1.0, 1.0);
    expect(result.tone).toBe('neutral');
    expect(result.rawDelta).toBe(0);
    expect(result.label).toMatch(/0\.00/);
  });

  it('does not leak floating-point noise into the label (uses fixed-2)', () => {
    // 0.1 + 0.2 - 0.3 ≈ 5.55e-17 — the helper must clamp this away.
    const result = computeRatioKpiDelta(0.3, 0.1 + 0.2);
    expect(result.tone).toBe('neutral');
    expect(result.label).not.toMatch(/e-/);
  });

  it('honours custom bilingual comparison label', () => {
    const result = computeRatioKpiDelta(1.05, 1.0, {
      comparisonLabel: '(vs baseline 1.00)',
    });
    expect(result.label).toMatch(/\(vs baseline 1\.00\)$/);
  });

  it('guards against NaN current (bad upstream EVM data) → neutral tone, no "−NaN" in label', () => {
    const result = computeRatioKpiDelta(NaN, 1.0);
    expect(result.tone).toBe('neutral');
    expect(result.rawDelta).toBe(0);
    expect(result.label).not.toMatch(/NaN/);
    expect(result.label).toMatch(/—/);
  });

  it('guards against Infinity (eg pv=0 division) → neutral tone, no "−Infinity"', () => {
    const result = computeRatioKpiDelta(Infinity, 1.0);
    expect(result.tone).toBe('neutral');
    expect(result.label).not.toMatch(/Infinity/);
  });
});

describe('formatFreshnessLabel', () => {
  const now = new Date('2026-06-01T12:00:00Z');

  it('returns "Just now" for < 1 minute', () => {
    const label = formatFreshnessLabel('2026-06-01T11:59:30Z', now);
    expect(label).toMatch(/Just now/);
  });

  it('returns "X min ago" between 1 and 59 minutes', () => {
    const label = formatFreshnessLabel('2026-06-01T11:55:00Z', now);
    expect(label).toMatch(/^อัปเดต 5 นาทีที่แล้ว/);
    expect(label).toMatch(/5 min ago/);
  });

  it('returns "X hr ago" between 1 and 23 hours', () => {
    const label = formatFreshnessLabel('2026-06-01T10:00:00Z', now);
    expect(label).toMatch(/2 hr ago/);
  });

  it('returns "X days ago" past 24 hours', () => {
    const label = formatFreshnessLabel('2026-05-29T12:00:00Z', now);
    expect(label).toMatch(/3 days ago/);
  });

  it('returns fallback when timestamp is null or malformed', () => {
    expect(formatFreshnessLabel(null, now)).toMatch(/No update info/);
    expect(formatFreshnessLabel('not-a-date', now)).toMatch(/No update info/);
  });

  it('handles future timestamps gracefully', () => {
    const future = formatFreshnessLabel('2027-01-01T00:00:00Z', now);
    expect(future).toMatch(/in future/);
  });
});

describe('getMostRecentProjectUpdatedAt', () => {
  it('returns null when no projects have history', () => {
    expect(getMostRecentProjectUpdatedAt([])).toBeNull();
    expect(getMostRecentProjectUpdatedAt([projectWithHistory('p1', [])])).toBeNull();
  });

  it('picks the latest enteredAt across all projects and entries', () => {
    const projects = [
      projectWithHistory('p1', ['2026-05-01T00:00:00Z', '2026-05-15T00:00:00Z']),
      projectWithHistory('p2', ['2026-05-10T00:00:00Z']),
      projectWithHistory('p3', ['2026-06-01T08:00:00Z']),
    ];
    expect(getMostRecentProjectUpdatedAt(projects)).toBe('2026-06-01T08:00:00Z');
  });

  it('skips entries with missing enteredAt fields', () => {
    const project = {
      id: 'p1',
      lifecycleStageHistory: [
        { id: 'x', stage: 'planning', enteredAt: '2026-06-01T00:00:00Z', enteredBy: 't' },
        { id: 'y', stage: 'planning', enteredAt: '', enteredBy: 't' },
      ],
    } as unknown as Project;
    expect(getMostRecentProjectUpdatedAt([project])).toBe('2026-06-01T00:00:00Z');
  });
});

describe('buildPortfolioFreshness', () => {
  const now = new Date('2026-06-01T12:00:00Z');

  it('combines latest-updated-at + bilingual label', () => {
    const projects = [projectWithHistory('p1', ['2026-06-01T11:30:00Z'])];
    const result = buildPortfolioFreshness(projects, now);
    expect(result.updatedAt).toBe('2026-06-01T11:30:00Z');
    expect(result.label).toMatch(/30 min ago/);
  });

  it('returns null + fallback label when nothing to compare', () => {
    const result = buildPortfolioFreshness([], now);
    expect(result.updatedAt).toBeNull();
    expect(result.label).toMatch(/No update info/);
  });
});
