'use client';

import { Alert } from 'antd';

import { formatBaht } from '@/lib/date-utils';
import type { DerivedEvmMetrics } from '@/lib/evm-metrics';

export function EvmAnalysisAlert({
  metrics,
  isOutsourced,
  bac,
  analysisAlertType,
}: {
  metrics: DerivedEvmMetrics | null;
  isOutsourced: boolean;
  bac: number;
  analysisAlertType: 'info' | 'warning' | 'success';
}) {
  return (
    <Alert
      type={analysisAlertType}
      showIcon
      message="วิเคราะห์สถานะโครงการ (Project Analysis)"
      description={
        metrics
          ? metrics.mode === 'in_house'
            ? `โครงการ${metrics.svPercent < 0 ? 'ช้ากว่าแผน' : 'เร็วกว่าแผน'} ${Math.abs(metrics.svPercent).toFixed(1)}% (SPI = ${metrics.spi.toFixed(2)}) และ${metrics.cvPercent < 0 ? 'เกินงบ' : 'ประหยัดงบ'} ${Math.abs(metrics.cvPercent).toFixed(1)}% (CPI = ${metrics.cpi.toFixed(2)}) โดยคาดว่าเมื่อปิดโครงการจะ${metrics.vac < 0 ? 'เกินงบ' : 'เหลืองบ'} ${formatBaht(Math.abs(Math.round(metrics.vac)))} บาท`
            : `มุมมองเจ้าของสัญญา: โครงการ${metrics.svPercent < 0 ? 'ช้ากว่าแผน' : 'เป็นไปตามแผน'} ${Math.abs(metrics.svPercent).toFixed(1)}% (SPI = ${metrics.spi.toFixed(2)}) ขณะนี้ตรวจรับมูลค่างาน ${formatBaht(metrics.ev)} บาท และจ่ายแล้ว ${formatBaht(metrics.paidToDate)} บาท ${metrics.paymentGap > 0 ? `ยังมีมูลค่างานรอจ่ายอีก ${formatBaht(metrics.paymentGap)} บาท` : metrics.paymentGap < 0 ? `โดยจ่ายนำหน้ามูลค่างาน ${formatBaht(Math.abs(metrics.paymentGap))} บาท` : 'มูลค่างานและยอดจ่ายสมดุล'}`
          : isOutsourced
            ? `สัญญานี้มีวงเงินรวม ${formatBaht(bac)} บาท แต่ยังไม่มีข้อมูลงวดความก้าวหน้า/เบิกจ่าย กรุณาบันทึกงวดแรกเพื่อเริ่มติดตาม PV, EV และ Paid to Date`
            : `โครงการนี้มีงบอนุมัติ ${formatBaht(bac)} บาท แต่ยังไม่มีข้อมูลงวด EVM สำหรับการวิเคราะห์ กรุณาบันทึกงวดแรกเพื่อเริ่มติดตาม PV, EV และ AC`
      }
      style={{ marginBottom: 24 }}
    />
  );
}
