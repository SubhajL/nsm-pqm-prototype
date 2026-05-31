/**
 * PR-30b — GFMIS contract fixture × schema parse tests.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  gfmisBudgetCommitmentSchema,
  gfmisDisbursementRecordSchema,
  type GfmisBudgetCommitment,
  type GfmisDisbursementRecord,
} from './contract';

const FIXTURE_DIR = join(__dirname, 'fixtures');

function loadFixture<T>(name: string): T {
  const raw = readFileSync(join(FIXTURE_DIR, name), 'utf-8');
  return JSON.parse(raw) as T;
}

describe('GFMIS contract schemas', () => {
  it('parses the disbursement-record fixture', () => {
    const fx = loadFixture<GfmisDisbursementRecord>(
      'disbursement-record.sample.json',
    );
    const parsed = gfmisDisbursementRecordSchema.parse(fx);
    expect(parsed.amountTHB).toBeGreaterThan(0);
    expect(parsed.costCenter).toMatch(/^\d{10}$/);
    expect(parsed.budgetLine).toMatch(/^\d{16}$/);
  });

  it('parses the budget-commitment fixture', () => {
    const fx = loadFixture<GfmisBudgetCommitment>(
      'budget-commitment.sample.json',
    );
    const parsed = gfmisBudgetCommitmentSchema.parse(fx);
    expect(parsed.commitmentAmountTHB).toBeGreaterThan(0);
    expect(parsed.fiscalYearBE).toBeGreaterThanOrEqual(2500);
  });

  it('rejects a disbursement record with a negative amount', () => {
    const fx = loadFixture<{ amountTHB: number }>(
      'disbursement-record.sample.json',
    );
    fx.amountTHB = -100;
    expect(() => gfmisDisbursementRecordSchema.parse(fx)).toThrow();
  });

  it('rejects a disbursement record with a malformed cost center', () => {
    const fx = loadFixture<{ costCenter: string }>(
      'disbursement-record.sample.json',
    );
    fx.costCenter = '123';
    expect(() => gfmisDisbursementRecordSchema.parse(fx)).toThrow();
  });
});
