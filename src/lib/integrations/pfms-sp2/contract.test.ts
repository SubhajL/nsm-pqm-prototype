/**
 * PR-30b — PFMS-SP2 contract fixture × schema parse tests.
 *
 * PFMS-SP2 wire format is unconfirmed at PR-30b; the schema reflects
 * the minimal shape we'd plausibly need (project linkage + reporting
 * window + scalar metrics). Validation conversation must happen at the
 * demo with RID-IT before we lock the contract.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  pfmsSp2ProjectReportSchema,
  type PfmsSp2ProjectReport,
} from './contract';

const FIXTURE_DIR = join(__dirname, 'fixtures');

function loadFixture<T>(name: string): T {
  const raw = readFileSync(join(FIXTURE_DIR, name), 'utf-8');
  return JSON.parse(raw) as T;
}

describe('PFMS-SP2 contract schema', () => {
  it('parses the project-report stub fixture', () => {
    const fx = loadFixture<PfmsSp2ProjectReport>(
      'project-report.stub.json',
    );
    const parsed = pfmsSp2ProjectReportSchema.parse(fx);
    expect(parsed.reportingPeriod.startDate <= parsed.reportingPeriod.endDate)
      .toBe(true);
    expect(parsed.physicalProgressPercent).toBeGreaterThanOrEqual(0);
    expect(parsed.physicalProgressPercent).toBeLessThanOrEqual(100);
  });

  it('rejects a report with physicalProgressPercent > 100', () => {
    const fx = loadFixture<{ physicalProgressPercent: number }>(
      'project-report.stub.json',
    );
    fx.physicalProgressPercent = 101;
    expect(() => pfmsSp2ProjectReportSchema.parse(fx)).toThrow();
  });

  it('rejects a report where the reporting period inverts', () => {
    const fx = loadFixture<{
      reportingPeriod: { startDate: string; endDate: string };
    }>('project-report.stub.json');
    fx.reportingPeriod = {
      startDate: '2026-09-01',
      endDate: '2026-08-01',
    };
    expect(() => pfmsSp2ProjectReportSchema.parse(fx)).toThrow();
  });
});
