'use client';

import { Card, Descriptions } from 'antd';

import { formatBahtCurrency } from '@/lib/date-utils';
import { COLORS } from '@/theme/antd-theme';
import type {
  DerivedEvmMetrics,
  DerivedInternalEvmMetrics,
  DerivedOutsourcedContractMetrics,
} from '@/lib/evm-metrics';

type ToneColor = 'success' | 'warning' | 'error' | 'processing';
type Tone = { color: ToneColor; summaryTh: string; summaryEn: string };

export function EvmDescriptions({
  bac,
  metrics,
  internalMetrics,
  outsourcedMetrics,
  isOutsourced,
  svIsPositive,
  cvIsPositive,
  vacIsPositive,
  spiTone,
  cpiTone,
  paymentGapTone,
}: {
  bac: number;
  metrics: DerivedEvmMetrics | null;
  internalMetrics: DerivedInternalEvmMetrics | null;
  outsourcedMetrics: DerivedOutsourcedContractMetrics | null;
  isOutsourced: boolean;
  svIsPositive: boolean;
  cvIsPositive: boolean;
  vacIsPositive: boolean;
  spiTone: Tone | null;
  cpiTone: Tone | null;
  paymentGapTone: Tone | null;
}) {
  return (
    <Card
      title="รายละเอียดตัวชี้วัด EVM (EVM Metrics Detail)"
      style={{ marginBottom: 24 }}
    >
      <Descriptions bordered column={2}>
        <Descriptions.Item label={isOutsourced ? 'BAC (Contract Value)' : 'BAC (Budget at Completion)'}>
          {bac > 0 ? formatBahtCurrency(bac) : '-'}
        </Descriptions.Item>
        <Descriptions.Item label="PV (Planned Value)">
          {metrics ? formatBahtCurrency(metrics.pv) : '-'}
        </Descriptions.Item>
        <Descriptions.Item label="EV (Earned Value)">
          {metrics ? formatBahtCurrency(metrics.ev) : '-'}
        </Descriptions.Item>
        <Descriptions.Item label={isOutsourced ? 'Paid to Date' : 'AC (Actual Cost)'}>
          {metrics
            ? formatBahtCurrency(metrics.mode === 'outsourced' ? metrics.paidToDate : metrics.ac)
            : '-'}
        </Descriptions.Item>
        <Descriptions.Item label="SV = EV - PV (Schedule Variance)">
          <span style={{ color: svIsPositive ? COLORS.success : COLORS.error }}>
            {metrics ? formatBahtCurrency(metrics.sv) : '-'}
          </span>
        </Descriptions.Item>
        {internalMetrics ? (
          <>
            <Descriptions.Item label="CV = EV - AC (Cost Variance)">
              <span style={{ color: cvIsPositive ? COLORS.success : COLORS.error }}>
                {formatBahtCurrency(internalMetrics.cv)}
              </span>
            </Descriptions.Item>
            <Descriptions.Item label="SPI = EV / PV">
              <span
                style={{
                  color:
                    spiTone?.color === 'success'
                      ? COLORS.success
                      : spiTone?.color === 'warning'
                        ? COLORS.warning
                        : COLORS.error,
                }}
              >
                {internalMetrics.spi.toFixed(2)}
              </span>
            </Descriptions.Item>
            <Descriptions.Item label="CPI = EV / AC">
              <span
                style={{
                  color:
                    cpiTone?.color === 'success'
                      ? COLORS.success
                      : cpiTone?.color === 'warning'
                        ? COLORS.warning
                        : COLORS.error,
                }}
              >
                {internalMetrics.cpi.toFixed(2)}
              </span>
            </Descriptions.Item>
            <Descriptions.Item label="EAC = BAC / CPI">
              {formatBahtCurrency(Math.round(internalMetrics.eac))}
            </Descriptions.Item>
            <Descriptions.Item label="ETC = EAC - AC">
              {formatBahtCurrency(Math.round(internalMetrics.etc))}
            </Descriptions.Item>
            <Descriptions.Item label="TCPI = (BAC - EV) / (BAC - AC)">
              {internalMetrics.tcpi.toFixed(2)}
            </Descriptions.Item>
            <Descriptions.Item label="VAC = BAC - EAC">
              <span style={{ color: vacIsPositive ? COLORS.success : COLORS.error }}>
                {formatBahtCurrency(Math.round(internalMetrics.vac))}
              </span>
            </Descriptions.Item>
          </>
        ) : (
          <>
            <Descriptions.Item label="SPI = EV / PV">
              <span
                style={{
                  color:
                    spiTone?.color === 'success'
                      ? COLORS.success
                      : spiTone?.color === 'warning'
                        ? COLORS.warning
                        : COLORS.error,
                }}
              >
                {metrics?.spi.toFixed(2) ?? '-'}
              </span>
            </Descriptions.Item>
            <Descriptions.Item label="Earned vs Paid Gap = EV - Paid">
              <span
                style={{
                  color:
                    paymentGapTone?.color === 'warning'
                      ? COLORS.warning
                      : paymentGapTone?.color === 'success'
                        ? COLORS.success
                        : COLORS.info,
                }}
              >
                {outsourcedMetrics ? formatBahtCurrency(outsourcedMetrics.paymentGap) : '-'}
              </span>
            </Descriptions.Item>
            <Descriptions.Item label="Paid / BAC">
              {outsourcedMetrics ? `${outsourcedMetrics.paidPercent.toFixed(1)}%` : '-'}
            </Descriptions.Item>
            <Descriptions.Item label="EV / BAC">
              {outsourcedMetrics ? `${outsourcedMetrics.evPercent.toFixed(1)}%` : '-'}
            </Descriptions.Item>
            <Descriptions.Item label="Remaining Payable = BAC - Paid">
              {outsourcedMetrics ? formatBahtCurrency(outsourcedMetrics.remainingPayable) : '-'}
            </Descriptions.Item>
            <Descriptions.Item label="มุมมองเจ้าของโครงการ">
              ติดตามความก้าวหน้าและยอดเบิกจ่าย ไม่ใช่ต้นทุนภายในของผู้รับจ้าง
            </Descriptions.Item>
          </>
        )}
      </Descriptions>
    </Card>
  );
}
