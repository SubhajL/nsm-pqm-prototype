'use client';

import { useMemo, useState } from 'react';
import type dayjs from 'dayjs';
import { Alert, Form, Typography, message } from 'antd';

import { canCreateProject } from '@/lib/auth';
import { useAuthStore } from '@/stores/useAuthStore';
import { useCreateEVMPoint, useDeleteEVMPoint, useEVM } from '@/hooks/useEVM';
import { useProject } from '@/hooks/useProjects';
import { useRouteProjectId } from '@/hooks/useRouteProjectId';
import { buildEvmExcelDocument, buildEvmPdfDocument } from '@/lib/export-documents';
import { downloadSpreadsheetReport, openPrintableReport } from '@/lib/export-utils';
import {
  deriveEvmMetrics,
  getPaymentGapTone,
  getCpiTone,
  getSpiTone,
} from '@/lib/evm-metrics';
import { DELIVERY_METHOD_LABELS, getProjectDeliveryMethod } from '@/types/project';

import { EvmAnalysisAlert } from './_components/EvmAnalysisAlert';
import { EvmDescriptions } from './_components/EvmDescriptions';
import { EvmSnapshotModal } from './_components/EvmSnapshotModal';
import { EvmSnapshotsTable } from './_components/EvmSnapshotsTable';
import { SCurveActionBar } from './_components/SCurveActionBar';
import { SCurveCharts } from './_components/SCurveCharts';
import { SCurveKpiRow } from './_components/SCurveKpiRow';
import { SCurveLoading } from './_components/SCurveLoading';
import { formatMonthThai } from './_components/helpers';

const { Title, Text } = Typography;

export default function SCurvePage() {
  const projectId = useRouteProjectId() ?? 'proj-001';
  const [form] = Form.useForm();
  const [open, setOpen] = useState(false);
  const { data: project, isLoading: isProjectLoading } = useProject(projectId);
  const { data: evmData, isLoading: isEvmLoading } = useEVM(projectId);
  const createEvmPoint = useCreateEVMPoint(projectId);
  const deleteEvmPoint = useDeleteEVMPoint(projectId);
  const currentUser = useAuthStore((s) => s.currentUser);
  const canManageEvm = canCreateProject(currentUser?.role);
  const deliveryMethod = getProjectDeliveryMethod(project);
  const deliveryMethodLabel = DELIVERY_METHOD_LABELS[deliveryMethod];
  const isOutsourced = deliveryMethod === 'outsourced';
  const bac = project?.budget ?? 0;
  const hasSnapshots = (evmData?.length ?? 0) > 0;

  const metrics = useMemo(() => deriveEvmMetrics(project, evmData), [evmData, project]);
  const internalMetrics = metrics?.mode === 'in_house' ? metrics : null;
  const outsourcedMetrics = metrics?.mode === 'outsourced' ? metrics : null;
  const latestSnapshotLabel = metrics
    ? `ข้อมูลล่าสุด ณ งวด ${metrics.latest.monthThai}`
    : isOutsourced
      ? 'ยังไม่มีข้อมูลงวดความก้าวหน้า/เบิกจ่าย กรุณาบันทึกงวดแรกของสัญญา'
      : 'ยังไม่มีข้อมูลงวด EVM กรุณาบันทึกงวดแรกของโครงการ';
  const spiTone = metrics ? getSpiTone(metrics.spi) : null;
  const svIsPositive = (metrics?.sv ?? 0) >= 0;
  const cpiTone = internalMetrics ? getCpiTone(internalMetrics.cpi) : null;
  const paymentGapTone = outsourcedMetrics ? getPaymentGapTone(outsourcedMetrics.paymentGap) : null;
  const vacIsPositive = internalMetrics ? internalMetrics.vac >= 0 : false;
  const cvIsPositive = internalMetrics ? internalMetrics.cv >= 0 : false;
  const analysisAlertType = !metrics
    ? 'info'
    : metrics.mode === 'in_house'
      ? (metrics.spi < 1 || metrics.cpi < 1 ? 'warning' : 'success')
      : metrics.spi < 1 || metrics.paymentGap < 0
        ? 'warning'
      : 'success';

  const handleCreate = async () => {
    try {
      const values = await form.validateFields() as {
        month: dayjs.Dayjs;
        pv: number;
        ev: number;
        actualAmount: number;
      };

      await createEvmPoint.mutateAsync({
        month: values.month.format('YYYY-MM'),
        monthThai: formatMonthThai(values.month),
        pv: values.pv,
        ev: values.ev,
        ac: isOutsourced ? undefined : values.actualAmount,
        paidToDate: isOutsourced ? values.actualAmount : undefined,
      });
      message.success('บันทึกงวด EVM แล้ว');
      setOpen(false);
      form.resetFields();
    } catch (error) {
      if (error instanceof Error && error.name === 'ApiError') {
        message.error(error.message);
      }
    }
  };

  const handleExportPdf = () => {
    if (!project) {
      return;
    }

    const opened = openPrintableReport(
      buildEvmPdfDocument({
        project,
        evmData: evmData ?? [],
        metrics,
      }),
    );
    if (!opened) {
      message.error('ไม่สามารถเปิดหน้าต่างรายงานได้ กรุณาอนุญาต pop-up');
    }
  };

  const handleExportExcel = () => {
    if (!project) {
      return;
    }

    downloadSpreadsheetReport(
      buildEvmExcelDocument({
        project,
        evmData: evmData ?? [],
        metrics,
      }),
    );
    message.success('ส่งออกข้อมูล EVM แล้ว');
  };

  const handleDeleteEvm = async (id: string) => {
    await deleteEvmPoint.mutateAsync({ id });
  };

  if (isProjectLoading || isEvmLoading || !project) {
    return <SCurveLoading />;
  }

  return (
    <div>
      <Title level={3} style={{ marginBottom: 4 }}>
        EVM Dashboard &mdash; {project?.name ?? 'รายละเอียดโครงการ'}
      </Title>
      <Text type="secondary" style={{ display: 'block', marginBottom: 24 }}>
        {latestSnapshotLabel} · {deliveryMethodLabel.th}
      </Text>

      <SCurveKpiRow
        metrics={metrics}
        internalMetrics={internalMetrics}
        outsourcedMetrics={outsourcedMetrics}
        isOutsourced={isOutsourced}
        spiTone={spiTone}
        cpiTone={cpiTone}
        vacIsPositive={vacIsPositive}
      />

      <SCurveCharts
        evmData={evmData}
        hasSnapshots={hasSnapshots}
        isOutsourced={isOutsourced}
        bac={bac}
      />

      <Alert
        type="info"
        showIcon
        message={
          isOutsourced
            ? 'SPI > 1.0 = เร็วกว่าแผน | SPI < 1.0 = ช้ากว่าแผน | EV > Paid = มูลค่างานนำหน้าเงินจ่าย | Paid > EV = มีการจ่ายล่วงหน้ากว่ามูลค่างาน'
            : 'SPI > 1.0 = เร็วกว่าแผน | SPI < 1.0 = ช้ากว่าแผน | CPI > 1.0 = ประหยัดงบ | CPI < 1.0 = เกินงบ'
        }
        style={{ marginBottom: 24 }}
      />

      <EvmDescriptions
        bac={bac}
        metrics={metrics}
        internalMetrics={internalMetrics}
        outsourcedMetrics={outsourcedMetrics}
        isOutsourced={isOutsourced}
        svIsPositive={svIsPositive}
        cvIsPositive={cvIsPositive}
        vacIsPositive={vacIsPositive}
        spiTone={spiTone}
        cpiTone={cpiTone}
        paymentGapTone={paymentGapTone}
      />

      <EvmSnapshotsTable
        evmData={evmData}
        isOutsourced={isOutsourced}
        bac={bac}
        canManageEvm={canManageEvm}
        onOpenCreate={() => setOpen(true)}
        onDelete={handleDeleteEvm}
      />

      <EvmAnalysisAlert
        metrics={metrics}
        isOutsourced={isOutsourced}
        bac={bac}
        analysisAlertType={analysisAlertType}
      />

      <SCurveActionBar onExportPdf={handleExportPdf} onExportExcel={handleExportExcel} />

      <EvmSnapshotModal
        open={open}
        isOutsourced={isOutsourced}
        form={form}
        confirmLoading={createEvmPoint.isPending}
        onCancel={() => {
          setOpen(false);
          form.resetFields();
        }}
        onOk={handleCreate}
      />
    </div>
  );
}
