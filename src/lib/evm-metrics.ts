import type { EVMDataPoint } from '@/types/evm';
import { getProjectExecutionModel, type Project } from '@/types/project';

interface BaseDerivedMetrics {
  latest: EVMDataPoint;
  bac: number;
  pv: number;
  ev: number;
  spi: number;
  sv: number;
  svPercent: number;
  evPercent: number;
}

export interface DerivedInternalEvmMetrics extends BaseDerivedMetrics {
  mode: 'internal';
  ac: number;
  cv: number;
  cpi: number;
  eac: number;
  etc: number;
  vac: number;
  tcpi: number;
  cvPercent: number;
}

export interface DerivedOutsourcedContractMetrics extends BaseDerivedMetrics {
  mode: 'outsourced';
  paidToDate: number;
  paymentGap: number;
  paidPercent: number;
  remainingPayable: number;
}

export type DerivedEvmMetrics =
  | DerivedInternalEvmMetrics
  | DerivedOutsourcedContractMetrics;

function getLatestSnapshot(evmData: EVMDataPoint[]) {
  return [...evmData].sort((a, b) => a.month.localeCompare(b.month))[evmData.length - 1];
}

function getActualCost(snapshot: EVMDataPoint) {
  return snapshot.ac ?? 0;
}

export function getPaidToDate(snapshot: EVMDataPoint) {
  return snapshot.paidToDate ?? snapshot.ac ?? 0;
}

export function deriveEvmMetrics(
  project: Pick<Project, 'budget' | 'executionModel'> | undefined,
  evmData: EVMDataPoint[] | undefined,
): DerivedEvmMetrics | null {
  const bac = project?.budget ?? 0;
  if (!evmData || evmData.length === 0 || bac <= 0) {
    return null;
  }

  const latest = getLatestSnapshot(evmData);
  const pv = latest.pv;
  const ev = latest.ev;
  const spi = pv > 0 ? ev / pv : 0;
  const sv = ev - pv;
  const svPercent = pv > 0 ? (sv / pv) * 100 : 0;
  const evPercent = bac > 0 ? (ev / bac) * 100 : 0;
  const mode = getProjectExecutionModel(project);

  if (mode === 'outsourced') {
    const paidToDate = getPaidToDate(latest);
    const paymentGap = ev - paidToDate;
    const paidPercent = bac > 0 ? (paidToDate / bac) * 100 : 0;
    const remainingPayable = Math.max(bac - paidToDate, 0);

    return {
      mode,
      latest,
      bac,
      pv,
      ev,
      spi,
      sv,
      svPercent,
      evPercent,
      paidToDate,
      paymentGap,
      paidPercent,
      remainingPayable,
    };
  }

  const ac = getActualCost(latest);
  const cpi = ac > 0 ? ev / ac : 0;
  const cv = ev - ac;
  const eac = cpi > 0 ? bac / cpi : bac;
  const etc = Math.max(eac - ac, 0);
  const vac = bac - eac;
  const tcpi = bac - ac !== 0 ? (bac - ev) / (bac - ac) : 0;
  const cvPercent = ac > 0 ? (cv / ac) * 100 : 0;

  return {
    mode,
    latest,
    bac,
    pv,
    ev,
    ac,
    sv,
    cv,
    spi,
    cpi,
    eac,
    etc,
    vac,
    tcpi,
    svPercent,
    cvPercent,
    evPercent,
  };
}

export function formatSignedPercent(value: number) {
  return `${value > 0 ? '+' : ''}${value.toFixed(1)}%`;
}

export function formatSignedCompactBaht(value: number) {
  const abs = Math.abs(value);
  const sign = value < 0 ? '-' : value > 0 ? '+' : '';

  if (abs >= 1_000_000) {
    return `${sign}${(abs / 1_000_000).toFixed(1)}M฿`;
  }

  if (abs >= 1_000) {
    return `${sign}${(abs / 1_000).toFixed(0)}K฿`;
  }

  return `${sign}${abs.toFixed(0)}฿`;
}

export function getSpiTone(spi: number) {
  if (spi < 0.95) {
    return {
      color: 'error',
      summaryTh: 'ล่าช้ากว่าแผน',
      summaryEn: 'Behind Schedule',
    } as const;
  }

  if (spi < 1) {
    return {
      color: 'warning',
      summaryTh: 'เริ่มช้ากว่าแผน',
      summaryEn: 'Slightly Behind',
    } as const;
  }

  return {
    color: 'success',
    summaryTh: 'เป็นไปตามแผน',
    summaryEn: 'On Schedule',
  } as const;
}

export function getCpiTone(cpi: number) {
  if (cpi < 0.95) {
    return {
      color: 'error',
      summaryTh: 'เกินงบ',
      summaryEn: 'Over Budget',
    } as const;
  }

  if (cpi < 1) {
    return {
      color: 'warning',
      summaryTh: 'เริ่มเกินงบ',
      summaryEn: 'Slightly Over Budget',
    } as const;
  }

  return {
    color: 'success',
    summaryTh: 'ประหยัดงบ',
    summaryEn: 'Under Budget',
  } as const;
}

export function getPaymentGapTone(paymentGap: number) {
  if (paymentGap < 0) {
    return {
      color: 'warning',
      summaryTh: 'จ่ายล่วงหน้ากว่ามูลค่างาน',
      summaryEn: 'Paid Ahead of Earned',
    } as const;
  }

  if (paymentGap > 0) {
    return {
      color: 'processing',
      summaryTh: 'ยังมีมูลค่างานรอเบิกจ่าย',
      summaryEn: 'Earned Ahead of Payment',
    } as const;
  }

  return {
    color: 'success',
    summaryTh: 'มูลค่างานและการจ่ายเงินสมดุล',
    summaryEn: 'Payment Aligned',
  } as const;
}
