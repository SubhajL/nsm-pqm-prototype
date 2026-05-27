import { describe, expect, it } from 'vitest';

import {
  deriveEvmMetrics,
  formatSignedCompactBaht,
  formatSignedPercent,
  getCpiTone,
  getPaidToDate,
  getPaymentGapTone,
  getSpiTone,
  type DerivedInternalEvmMetrics,
  type DerivedOutsourcedContractMetrics,
} from '@/lib/evm-metrics';
import type { EVMDataPoint } from '@/types/evm';
import type { Project } from '@/types/project';

// ---------------------------------------------------------------------------
// Characterization tests: these lock CURRENT behavior of evm-metrics, including
// any quirks. Inputs are illustrative; do not interpret as "correct" requirements.
// ---------------------------------------------------------------------------

function makeSnapshot(overrides: Partial<EVMDataPoint> = {}): EVMDataPoint {
  return {
    id: 'EVM-001',
    projectId: 'PJ-TEST',
    month: '2026-01',
    monthThai: 'มกราคม 2569',
    pv: 500_000,
    ev: 460_000,
    ac: 440_000,
    spi: 0.92,
    cpi: 1.0454545,
    ...overrides,
  };
}

function makeProject(overrides: Partial<Project> = {}): Pick<Project, 'budget' | 'executionModel'> {
  return {
    budget: 1_000_000,
    executionModel: 'in_house',
    ...overrides,
  } as Pick<Project, 'budget' | 'executionModel'>;
}

describe('deriveEvmMetrics — guard clauses', () => {
  it('returns null when project is undefined', () => {
    expect(deriveEvmMetrics(undefined, [makeSnapshot()])).toBeNull();
  });

  it('returns null when evmData is undefined', () => {
    expect(deriveEvmMetrics(makeProject(), undefined)).toBeNull();
  });

  it('returns null when evmData is empty', () => {
    expect(deriveEvmMetrics(makeProject(), [])).toBeNull();
  });

  it('returns null when budget is zero', () => {
    expect(deriveEvmMetrics(makeProject({ budget: 0 }), [makeSnapshot()])).toBeNull();
  });

  it('returns null when budget is negative', () => {
    expect(deriveEvmMetrics(makeProject({ budget: -1 }), [makeSnapshot()])).toBeNull();
  });
});

describe('deriveEvmMetrics — in-house execution mode', () => {
  it('derives full SPI, CPI, EAC, ETC, VAC, TCPI for a typical snapshot', () => {
    const project = makeProject({ budget: 1_000_000, executionModel: 'in_house' });
    const snapshot = makeSnapshot({ pv: 500_000, ev: 460_000, ac: 440_000 });

    const result = deriveEvmMetrics(project, [snapshot]) as DerivedInternalEvmMetrics;

    expect(result).not.toBeNull();
    expect(result.mode).toBe('in_house');
    expect(result.bac).toBe(1_000_000);
    expect(result.pv).toBe(500_000);
    expect(result.ev).toBe(460_000);
    expect(result.ac).toBe(440_000);
    expect(result.spi).toBeCloseTo(0.92, 5);
    expect(result.sv).toBe(-40_000);
    expect(result.svPercent).toBeCloseTo(-8, 5);
    expect(result.evPercent).toBeCloseTo(46, 5);
    expect(result.cpi).toBeCloseTo(1.0454545454545454, 5);
    expect(result.cv).toBe(20_000);
    expect(result.eac).toBeCloseTo(956521.7391304348, 5);
    expect(result.etc).toBeCloseTo(516521.7391304348, 5);
    expect(result.vac).toBeCloseTo(43478.26086956519, 5);
    expect(result.tcpi).toBeCloseTo(0.9642857142857143, 5);
    expect(result.cvPercent).toBeCloseTo(4.545454545454546, 5);
    expect(result.latest).toBe(snapshot);
  });

  it('defaults missing executionModel to in_house', () => {
    const result = deriveEvmMetrics(
      { budget: 1_000_000 } as Pick<Project, 'budget' | 'executionModel'>,
      [makeSnapshot()],
    );
    expect(result?.mode).toBe('in_house');
  });

  it('uses the snapshot with the latest month when multiple are provided', () => {
    const january = makeSnapshot({ month: '2026-01', ev: 100_000 });
    const march = makeSnapshot({ month: '2026-03', ev: 300_000 });
    const february = makeSnapshot({ month: '2026-02', ev: 200_000 });

    const result = deriveEvmMetrics(makeProject(), [january, march, february]);
    expect(result?.latest).toBe(march);
    expect(result?.ev).toBe(300_000);
  });

  it('returns spi = 0 when pv = 0', () => {
    const result = deriveEvmMetrics(makeProject(), [
      makeSnapshot({ pv: 0, ev: 100, ac: 100 }),
    ]) as DerivedInternalEvmMetrics;
    expect(result.spi).toBe(0);
    expect(result.svPercent).toBe(0);
  });

  it('returns cpi = 0 and eac = bac when ac = 0', () => {
    const result = deriveEvmMetrics(makeProject({ budget: 500_000 }), [
      makeSnapshot({ pv: 100_000, ev: 100_000, ac: 0 }),
    ]) as DerivedInternalEvmMetrics;
    expect(result.cpi).toBe(0);
    expect(result.eac).toBe(500_000);
    expect(result.etc).toBe(500_000); // max(eac - ac, 0) = max(500000, 0)
    expect(result.vac).toBe(0); // bac - eac = 0
    expect(result.cvPercent).toBe(0);
  });

  it('returns tcpi = 0 when bac = ac (avoids division by zero quirk)', () => {
    const result = deriveEvmMetrics(makeProject({ budget: 500_000 }), [
      makeSnapshot({ pv: 500_000, ev: 400_000, ac: 500_000 }),
    ]) as DerivedInternalEvmMetrics;
    expect(result.tcpi).toBe(0);
  });

  it('handles snapshot without ac field by defaulting ac to 0', () => {
    const snapshot = makeSnapshot();
    const stripped = { ...snapshot, ac: undefined as unknown as number };
    const result = deriveEvmMetrics(makeProject(), [stripped]) as DerivedInternalEvmMetrics;
    expect(result.ac).toBe(0);
    expect(result.cpi).toBe(0);
  });
});

describe('deriveEvmMetrics — outsourced execution mode', () => {
  it('derives paidToDate, paymentGap, paidPercent, remainingPayable', () => {
    const project = makeProject({ budget: 1_000_000, executionModel: 'outsourced' });
    const snapshot = makeSnapshot({
      pv: 500_000,
      ev: 460_000,
      ac: 440_000,
      paidToDate: 400_000,
    });

    const result = deriveEvmMetrics(project, [snapshot]) as DerivedOutsourcedContractMetrics;

    expect(result.mode).toBe('outsourced');
    expect(result.bac).toBe(1_000_000);
    expect(result.pv).toBe(500_000);
    expect(result.ev).toBe(460_000);
    expect(result.spi).toBeCloseTo(0.92, 5);
    expect(result.paidToDate).toBe(400_000);
    expect(result.paymentGap).toBe(60_000); // ev - paidToDate
    expect(result.paidPercent).toBeCloseTo(40, 5);
    expect(result.remainingPayable).toBe(600_000); // bac - paidToDate
    // Outsourced result does not expose ac/cpi/eac
    expect(result).not.toHaveProperty('cpi');
    expect(result).not.toHaveProperty('eac');
  });

  it('falls back to ac when paidToDate is missing', () => {
    const project = makeProject({ budget: 1_000_000, executionModel: 'outsourced' });
    const snapshot = makeSnapshot({ ac: 250_000, paidToDate: undefined });
    const result = deriveEvmMetrics(project, [snapshot]) as DerivedOutsourcedContractMetrics;
    expect(result.paidToDate).toBe(250_000);
  });

  it('clamps remainingPayable at zero when paidToDate exceeds bac', () => {
    const project = makeProject({ budget: 100_000, executionModel: 'outsourced' });
    const snapshot = makeSnapshot({ pv: 100_000, ev: 100_000, paidToDate: 150_000 });
    const result = deriveEvmMetrics(project, [snapshot]) as DerivedOutsourcedContractMetrics;
    expect(result.remainingPayable).toBe(0);
    expect(result.paidPercent).toBe(150);
  });
});

describe('getPaidToDate', () => {
  it('returns paidToDate when provided', () => {
    expect(getPaidToDate(makeSnapshot({ paidToDate: 999, ac: 1 }))).toBe(999);
  });

  it('falls back to ac when paidToDate is undefined', () => {
    expect(getPaidToDate(makeSnapshot({ paidToDate: undefined, ac: 500 }))).toBe(500);
  });

  it('returns 0 when both paidToDate and ac are missing', () => {
    expect(
      getPaidToDate(
        makeSnapshot({
          paidToDate: undefined,
          ac: undefined as unknown as number,
        }),
      ),
    ).toBe(0);
  });
});

describe('formatSignedPercent', () => {
  it('prefixes positive values with +', () => {
    expect(formatSignedPercent(5.5)).toBe('+5.5%');
  });

  it('keeps native sign on negative values', () => {
    expect(formatSignedPercent(-2.0)).toBe('-2.0%');
  });

  it('renders zero without a sign prefix', () => {
    expect(formatSignedPercent(0)).toBe('0.0%');
  });
});

describe('formatSignedCompactBaht', () => {
  it('formats millions with M฿ suffix', () => {
    expect(formatSignedCompactBaht(1_500_000)).toBe('+1.5M฿');
    expect(formatSignedCompactBaht(-2_500_000)).toBe('-2.5M฿');
  });

  it('formats thousands with K฿ suffix (no decimals)', () => {
    expect(formatSignedCompactBaht(5_000)).toBe('+5K฿');
    expect(formatSignedCompactBaht(-12_345)).toBe('-12K฿');
  });

  it('formats sub-thousand values as plain Baht (no decimals)', () => {
    expect(formatSignedCompactBaht(750)).toBe('+750฿');
    expect(formatSignedCompactBaht(-200)).toBe('-200฿');
  });

  it('renders zero without a sign prefix', () => {
    expect(formatSignedCompactBaht(0)).toBe('0฿');
  });
});

describe('getSpiTone', () => {
  it('returns error tone for spi below 0.95', () => {
    expect(getSpiTone(0.5).color).toBe('error');
    expect(getSpiTone(0.94999).color).toBe('error');
  });

  it('returns warning tone for spi in [0.95, 1)', () => {
    expect(getSpiTone(0.95).color).toBe('warning');
    expect(getSpiTone(0.999).color).toBe('warning');
  });

  it('returns success tone for spi >= 1', () => {
    expect(getSpiTone(1).color).toBe('success');
    expect(getSpiTone(1.2).color).toBe('success');
  });
});

describe('getCpiTone', () => {
  it('returns error tone for cpi below 0.95', () => {
    expect(getCpiTone(0.5).color).toBe('error');
  });

  it('returns warning tone for cpi in [0.95, 1)', () => {
    expect(getCpiTone(0.97).color).toBe('warning');
  });

  it('returns success tone for cpi >= 1', () => {
    expect(getCpiTone(1.05).color).toBe('success');
  });
});

describe('getPaymentGapTone', () => {
  it('returns warning when paymentGap < 0 (overpaid)', () => {
    expect(getPaymentGapTone(-100).color).toBe('warning');
  });

  it('returns processing when paymentGap > 0 (under-paid)', () => {
    expect(getPaymentGapTone(100).color).toBe('processing');
  });

  it('returns success when paymentGap == 0 (aligned)', () => {
    expect(getPaymentGapTone(0).color).toBe('success');
  });
});
