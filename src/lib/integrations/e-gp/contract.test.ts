/**
 * PR-30b — e-GP contract fixture × schema parse tests.
 *
 * The point is the lock-in: every JSON file under `./fixtures/` MUST
 * parse cleanly against the matching Zod schema in `./contract.ts`.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  egpAwardNoticeSchema,
  egpProcurementReferenceSchema,
  type EgpAwardNotice,
  type EgpProcurementReference,
} from './contract';

const FIXTURE_DIR = join(__dirname, 'fixtures');

function loadFixture<T>(name: string): T {
  const raw = readFileSync(join(FIXTURE_DIR, name), 'utf-8');
  return JSON.parse(raw) as T;
}

describe('e-GP contract schemas', () => {
  it('parses the procurement-reference fixture', () => {
    const fx = loadFixture<EgpProcurementReference>(
      'procurement-reference.sample.json',
    );
    const parsed = egpProcurementReferenceSchema.parse(fx);
    // PR-30b ships a sample reference under the synthetic "EGP-SAMPLE"
    // prefix. Real records use other prefixes; the test only asserts
    // the wire shape, never the value.
    expect(parsed.referenceId).toMatch(/^EGP-/);
    expect(parsed.fiscalYearBE).toBeGreaterThanOrEqual(2500);
  });

  it('parses the award-notice fixture', () => {
    const fx = loadFixture<EgpAwardNotice>('award-notice.sample.json');
    const parsed = egpAwardNoticeSchema.parse(fx);
    expect(parsed.awardedContractor.taxId).toMatch(/^\d{13}$/);
    expect(parsed.awardAmountTHB).toBeGreaterThan(0);
  });

  it('rejects a procurement reference missing the fiscal year', () => {
    const fx = loadFixture<Record<string, unknown>>(
      'procurement-reference.sample.json',
    );
    delete fx.fiscalYearBE;
    expect(() => egpProcurementReferenceSchema.parse(fx)).toThrow();
  });

  it('rejects an award notice with a malformed Thai tax id', () => {
    const fx = loadFixture<{
      awardedContractor: { taxId: string };
    }>('award-notice.sample.json');
    fx.awardedContractor.taxId = '12345'; // too short
    expect(() => egpAwardNoticeSchema.parse(fx)).toThrow();
  });
});
