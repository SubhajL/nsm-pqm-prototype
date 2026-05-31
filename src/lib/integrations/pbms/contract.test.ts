/**
 * PR-30b — PBMS contract fixture × schema parse tests.
 *
 * PBMS wire format is unconfirmed at PR-30b. Schema is a best-effort
 * stub describing a budget-line balance / utilisation pair, pending
 * RID-IT validation at the demo.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  pbmsBudgetUtilisationSchema,
  type PbmsBudgetUtilisation,
} from './contract';

const FIXTURE_DIR = join(__dirname, 'fixtures');

function loadFixture<T>(name: string): T {
  const raw = readFileSync(join(FIXTURE_DIR, name), 'utf-8');
  return JSON.parse(raw) as T;
}

describe('PBMS contract schema', () => {
  it('parses the budget-utilisation stub fixture', () => {
    const fx = loadFixture<PbmsBudgetUtilisation>(
      'budget-utilisation.stub.json',
    );
    const parsed = pbmsBudgetUtilisationSchema.parse(fx);
    expect(parsed.allocatedTHB).toBeGreaterThanOrEqual(parsed.utilisedTHB);
    expect(parsed.utilisationPercent).toBeGreaterThanOrEqual(0);
    expect(parsed.utilisationPercent).toBeLessThanOrEqual(100);
  });

  it('rejects a record where utilisation exceeds allocation', () => {
    const fx = loadFixture<{
      allocatedTHB: number;
      utilisedTHB: number;
    }>('budget-utilisation.stub.json');
    fx.utilisedTHB = fx.allocatedTHB + 1;
    expect(() => pbmsBudgetUtilisationSchema.parse(fx)).toThrow();
  });

  it('rejects a negative allocation', () => {
    const fx = loadFixture<{ allocatedTHB: number }>(
      'budget-utilisation.stub.json',
    );
    fx.allocatedTHB = -1;
    expect(() => pbmsBudgetUtilisationSchema.parse(fx)).toThrow();
  });
});
