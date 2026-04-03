'use client';

import { useMemo, useState } from 'react';
import dayjs from 'dayjs';
import {
  Alert,
  Button,
  Card,
  Col,
  DatePicker,
  Descriptions,
  Empty,
  Form,
  InputNumber,
  Modal,
  Popconfirm,
  Row,
  Skeleton,
  Space,
  Tag,
  Table,
  Typography,
  message,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  DeleteOutlined,
  ArrowDownOutlined,
  ArrowUpOutlined,
  CheckCircleOutlined,
  FilePdfOutlined,
  FileExcelOutlined,
  InfoCircleOutlined,
  UnorderedListOutlined,
} from '@ant-design/icons';
import dynamic from 'next/dynamic';

import { canCreateProject } from '@/lib/auth';
import { useAuthStore } from '@/stores/useAuthStore';
import { useCreateEVMPoint, useDeleteEVMPoint, useEVM } from '@/hooks/useEVM';
import { useProject } from '@/hooks/useProjects';
import { useRouteProjectId } from '@/hooks/useRouteProjectId';
import { KPICard } from '@/components/common/KPICard';
import { buildEvmExcelDocument, buildEvmPdfDocument } from '@/lib/export-documents';
import { formatBaht } from '@/lib/date-utils';
import { downloadSpreadsheetReport, openPrintableReport } from '@/lib/export-utils';
import { COLORS } from '@/theme/antd-theme';
import {
  deriveEvmMetrics,
  formatSignedCompactBaht,
  formatSignedPercent,
  getPaymentGapTone,
  getPaidToDate,
  getCpiTone,
  getSpiTone,
} from '@/lib/evm-metrics';
import type { EVMDataPoint } from '@/types/evm';
import { getProjectExecutionModel, PROJECT_EXECUTION_MODEL_LABELS } from '@/types/project';

const { Title, Text } = Typography;

const SCurveChart = dynamic(
  () =>
    import('@/components/charts/SCurveChart').then((m) => ({
      default: m.SCurveChart,
    })),
  { ssr: false },
);

const CPISPITrendChart = dynamic(
  () =>
    import('@/components/charts/CPISPITrendChart').then((m) => ({
      default: m.CPISPITrendChart,
    })),
  { ssr: false },
);

function formatMonthThai(month: dayjs.Dayjs) {
  const thaiMonths = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
  const shortYear = (month.year() + 543) % 100;
  return `${thaiMonths[month.month()]} ${shortYear}`;
}

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
  const executionModel = getProjectExecutionModel(project);
  const executionModelLabel = PROJECT_EXECUTION_MODEL_LABELS[executionModel];
  const isOutsourced = executionModel === 'outsourced';
  const bac = project?.budget ?? 0;
  const hasSnapshots = (evmData?.length ?? 0) > 0;

  const metrics = useMemo(() => deriveEvmMetrics(project, evmData), [evmData, project]);
  const internalMetrics = metrics?.mode === 'internal' ? metrics : null;
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
    : metrics.mode === 'internal'
      ? (metrics.spi < 1 || metrics.cpi < 1 ? 'warning' : 'success')
      : metrics.spi < 1 || metrics.paymentGap < 0
        ? 'warning'
      : 'success';

  const evmColumns: ColumnsType<EVMDataPoint> = [
    {
      title: 'เดือน',
      dataIndex: 'monthThai',
      key: 'monthThai',
      width: 120,
    },
    {
      title: 'PV',
      dataIndex: 'pv',
      key: 'pv',
      render: (value: number) => `${formatBaht(value)} ฿`,
    },
    {
      title: 'EV',
      dataIndex: 'ev',
      key: 'ev',
      render: (value: number) => `${formatBaht(value)} ฿`,
    },
    {
      title: isOutsourced ? 'Paid to Date' : 'AC',
      key: 'actualAmount',
      render: (_value: unknown, record) => `${formatBaht(isOutsourced ? getPaidToDate(record) : record.ac)} ฿`,
    },
    ...(isOutsourced
      ? [
          {
            title: 'SPI',
            dataIndex: 'spi',
            key: 'spi',
            render: (value: number) => value.toFixed(2),
          },
          {
            title: 'จ่ายแล้ว/สัญญา',
            key: 'paidPercent',
            render: (_value: unknown, record: EVMDataPoint) => `${(((isOutsourced ? getPaidToDate(record) : record.ac) / Math.max(bac, 1)) * 100).toFixed(1)}%`,
          },
        ]
      : [
          {
            title: 'SPI',
            dataIndex: 'spi',
            key: 'spi',
            render: (value: number) => value.toFixed(2),
          },
          {
            title: 'CPI',
            dataIndex: 'cpi',
            key: 'cpi',
            render: (value: number) => value.toFixed(2),
          },
        ]),
    {
      title: 'จัดการ',
      key: 'actions',
      width: 120,
      align: 'center',
      render: (_value, record) =>
        canManageEvm ? (
          <Popconfirm
            title="ลบงวด EVM นี้"
            description="ต้องการลบข้อมูล EVM งวดนี้ใช่หรือไม่"
            okText="ลบ"
            cancelText="ยกเลิก"
            onConfirm={async () => {
              try {
                await deleteEvmPoint.mutateAsync({ id: record.id });
                message.success('ลบข้อมูลงวด EVM แล้ว');
              } catch (error) {
                message.error(error instanceof Error ? error.message : 'ไม่สามารถลบข้อมูลงวด EVM ได้');
              }
            }}
          >
            <Button
              danger
              size="small"
              icon={<DeleteOutlined />}
              aria-label={`ลบงวด EVM ${record.monthThai}`}
            />
          </Popconfirm>
        ) : null,
    },
  ];

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

  if (isProjectLoading || isEvmLoading || !project) {
    return (
      <div>
        <Title level={3}>EVM Dashboard</Title>
        <Row gutter={16}>
          {[1, 2, 3, 4].map((i) => (
            <Col span={6} key={i}>
              <Card>
                <Skeleton active paragraph={{ rows: 2 }} />
              </Card>
            </Col>
          ))}
        </Row>
        <Row gutter={16} style={{ marginTop: 16 }}>
          <Col span={14}>
            <Card>
              <Skeleton active paragraph={{ rows: 8 }} />
            </Card>
          </Col>
          <Col span={10}>
            <Card>
              <Skeleton active paragraph={{ rows: 8 }} />
            </Card>
          </Col>
        </Row>
      </div>
    );
  }

  return (
    <div>
      {/* Section 1: Title */}
      <Title level={3} style={{ marginBottom: 4 }}>
        EVM Dashboard &mdash; {project?.name ?? 'รายละเอียดโครงการ'}
      </Title>
      <Text type="secondary" style={{ display: 'block', marginBottom: 24 }}>
        {latestSnapshotLabel} · {executionModelLabel.th}
      </Text>

      {/* Section 2: KPI Cards */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}>
            <KPICard
              title="SPI (Schedule Performance Index)"
              value={metrics?.spi.toFixed(2) ?? '-'}
            icon={metrics ? ((metrics.spi ?? 0) >= 1 ? <ArrowUpOutlined /> : <ArrowDownOutlined />) : <InfoCircleOutlined />}
            color={
              spiTone?.color === 'success'
                ? COLORS.success
                : spiTone?.color === 'warning'
                  ? COLORS.warning
                  : metrics
                    ? COLORS.error
                    : COLORS.info
            }
            subtitle={spiTone ? `${spiTone.summaryTh} (${spiTone.summaryEn})` : 'ยังไม่มีข้อมูลงวด'}
          />
        </Col>
        {isOutsourced ? (
          <>
            <Col span={6}>
              <KPICard
                title="EV (Earned Value)"
                value={outsourcedMetrics ? `${(outsourcedMetrics.ev / 1_000_000).toFixed(1)}M฿` : '-'}
                icon={<InfoCircleOutlined />}
                color={COLORS.info}
                subtitle={outsourcedMetrics ? 'มูลค่างานที่ตรวจรับได้ตามความก้าวหน้า' : 'ยังไม่มีข้อมูลงวด'}
              />
            </Col>
            <Col span={6}>
              <KPICard
                title="Paid to Date"
                value={outsourcedMetrics ? `${(outsourcedMetrics.paidToDate / 1_000_000).toFixed(1)}M฿` : '-'}
                icon={<CheckCircleOutlined />}
                color={COLORS.success}
                subtitle={outsourcedMetrics ? 'จ่ายแล้วสะสม (Owner Disbursement)' : 'ยังไม่มีข้อมูลงวด'}
              />
            </Col>
            <Col span={6}>
              <KPICard
                title="Remaining Payable"
                value={outsourcedMetrics ? formatSignedCompactBaht(outsourcedMetrics.remainingPayable) : '-'}
                icon={<InfoCircleOutlined />}
                color={COLORS.warning}
                subtitle={outsourcedMetrics ? 'คงเหลือที่ต้องจ่ายตามวงเงินสัญญา' : 'ยังไม่มีข้อมูลงวด'}
              />
            </Col>
          </>
        ) : (
          <>
            <Col span={6}>
              <KPICard
                title="CPI (Cost Performance Index)"
                value={internalMetrics ? internalMetrics.cpi.toFixed(2) : '-'}
                icon={internalMetrics ? ((internalMetrics.cpi ?? 0) >= 1 ? <ArrowUpOutlined /> : <ArrowDownOutlined />) : <InfoCircleOutlined />}
                color={
                  cpiTone?.color === 'success'
                    ? COLORS.success
                    : cpiTone?.color === 'warning'
                      ? COLORS.warning
                      : internalMetrics
                        ? COLORS.error
                        : COLORS.info
                }
                subtitle={cpiTone ? `${cpiTone.summaryTh} (${cpiTone.summaryEn})` : 'ยังไม่มีข้อมูลงวด'}
              />
            </Col>
            <Col span={6}>
              <KPICard
                title="EAC (Estimate at Completion)"
                value={internalMetrics ? `${(internalMetrics.eac / 1_000_000).toFixed(1)}M฿` : '-'}
                icon={<InfoCircleOutlined />}
                color={COLORS.info}
                subtitle="ประมาณการต้นทุนเมื่อแล้วเสร็จ (Estimate at Completion)"
              />
            </Col>
            <Col span={6}>
              <KPICard
                title="VAC (Variance at Completion)"
                value={internalMetrics ? formatSignedCompactBaht(internalMetrics.vac) : '-'}
                icon={<CheckCircleOutlined />}
                color={vacIsPositive ? COLORS.success : COLORS.error}
                subtitle={
                  vacIsPositive
                    ? 'งบประมาณคงเหลือ (Budget Remaining)'
                    : 'แนวโน้มเกินงบ (Budget Overrun)'
                }
              />
            </Col>
          </>
        )}
      </Row>

      {/* Section 3: Charts */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={14}>
          <Card
            title={isOutsourced ? 'S-Curve / Contract Progress' : 'S-Curve'}
            styles={{ body: { padding: '16px 24px' } }}
          >
            {hasSnapshots ? (
              <SCurveChart
                data={(evmData ?? []).map((point) => ({
                  monthThai: point.monthThai,
                  pv: point.pv,
                  ev: point.ev,
                  actual: isOutsourced ? getPaidToDate(point) : point.ac,
                }))}
                height={350}
                actualSeriesLabel={isOutsourced ? 'Paid to Date — จ่ายแล้วสะสม' : 'AC — ค่าใช้จ่ายจริง (Actual)'}
              />
            ) : (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description={isOutsourced ? 'ยังไม่มีเส้นโค้งความก้าวหน้า/เบิกจ่าย เพราะยังไม่มีข้อมูลงวด' : 'ยังไม่มีเส้นโค้ง EVM เพราะยังไม่มีข้อมูลงวด'}
              />
            )}
            <div style={{ marginTop: 12 }}>
              <Space size={8}>
                <Tag color={svIsPositive ? 'green' : 'red'}>
                  Schedule Variance: {metrics ? formatSignedPercent(metrics.svPercent) : '-'}
                </Tag>
                {internalMetrics ? (
                  <Tag color={cvIsPositive ? 'green' : 'red'}>
                    Cost Variance: {formatSignedPercent(internalMetrics.cvPercent)}
                  </Tag>
                ) : (
                  <Tag color={paymentGapTone?.color === 'warning' ? 'gold' : paymentGapTone?.color === 'success' ? 'green' : 'blue'}>
                    Earned vs Paid Gap: {outsourcedMetrics ? formatSignedCompactBaht(outsourcedMetrics.paymentGap) : '-'}
                  </Tag>
                )}
              </Space>
            </div>
          </Card>
        </Col>
        <Col span={10}>
          <Card
            title={isOutsourced ? 'Earned / Paid Trend' : 'CPI/SPI Trend'}
            styles={{ body: { padding: '16px 24px' } }}
          >
            {hasSnapshots ? (
              <CPISPITrendChart
                data={(evmData ?? []).map((point) => ({
                  monthThai: point.monthThai,
                  primary: isOutsourced ? getPaidToDate(point) / Math.max(bac, 1) : point.cpi,
                  secondary: isOutsourced ? point.ev / Math.max(bac, 1) : point.spi,
                }))}
                height={350}
                primaryLabel={isOutsourced ? 'Paid/BAC' : 'CPI'}
                secondaryLabel={isOutsourced ? 'EV/BAC' : 'SPI'}
                primaryColor={isOutsourced ? COLORS.success : '#52c41a'}
                secondaryColor={COLORS.info}
                referenceLine={isOutsourced ? null : 1}
                yMin={0}
                yMax={isOutsourced ? 1.1 : 1.2}
                valueFormatter={isOutsourced ? ((value) => `${(value * 100).toFixed(0)}%`) : ((value) => value.toFixed(2))}
                primaryLabelPosition="top"
                secondaryLabelPosition="bottom"
              />
            ) : (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description={isOutsourced ? 'ยังไม่มีแนวโน้มการเบิกจ่าย เพราะยังไม่มีข้อมูลงวด' : 'ยังไม่มีแนวโน้ม CPI/SPI เพราะยังไม่มีข้อมูลงวด'}
              />
            )}
          </Card>
        </Col>
      </Row>

      {/* Section 4: Quick Tip */}
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

      {/* Section 5: EVM Detail Table */}
      <Card
        title="รายละเอียดตัวชี้วัด EVM (EVM Metrics Detail)"
        style={{ marginBottom: 24 }}
      >
        <Descriptions bordered column={2}>
          <Descriptions.Item label={isOutsourced ? 'BAC (Contract Value)' : 'BAC (Budget at Completion)'}>
            {bac > 0 ? `${formatBaht(bac)} ฿` : '-'}
          </Descriptions.Item>
          <Descriptions.Item label="PV (Planned Value)">
            {metrics ? `${formatBaht(metrics.pv)} ฿` : '-'}
          </Descriptions.Item>
          <Descriptions.Item label="EV (Earned Value)">
            {metrics ? `${formatBaht(metrics.ev)} ฿` : '-'}
          </Descriptions.Item>
          <Descriptions.Item label={isOutsourced ? 'Paid to Date' : 'AC (Actual Cost)'}>
            {metrics
              ? `${formatBaht(metrics.mode === 'outsourced' ? metrics.paidToDate : metrics.ac)} ฿`
              : '-'}
          </Descriptions.Item>
          <Descriptions.Item label="SV = EV - PV (Schedule Variance)">
            <span style={{ color: svIsPositive ? COLORS.success : COLORS.error }}>
              {metrics ? `${formatBaht(metrics.sv)} ฿` : '-'}
            </span>
          </Descriptions.Item>
          {internalMetrics ? (
            <>
              <Descriptions.Item label="CV = EV - AC (Cost Variance)">
                <span style={{ color: cvIsPositive ? COLORS.success : COLORS.error }}>
                  {`${formatBaht(internalMetrics.cv)} ฿`}
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
                {`${formatBaht(Math.round(internalMetrics.eac))} ฿`}
              </Descriptions.Item>
              <Descriptions.Item label="ETC = EAC - AC">
                {`${formatBaht(Math.round(internalMetrics.etc))} ฿`}
              </Descriptions.Item>
              <Descriptions.Item label="TCPI = (BAC - EV) / (BAC - AC)">
                {internalMetrics.tcpi.toFixed(2)}
              </Descriptions.Item>
              <Descriptions.Item label="VAC = BAC - EAC">
                <span style={{ color: vacIsPositive ? COLORS.success : COLORS.error }}>
                  {`${formatBaht(Math.round(internalMetrics.vac))} ฿`}
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
                  {outsourcedMetrics ? `${formatBaht(outsourcedMetrics.paymentGap)} ฿` : '-'}
                </span>
              </Descriptions.Item>
              <Descriptions.Item label="Paid / BAC">
                {outsourcedMetrics ? `${outsourcedMetrics.paidPercent.toFixed(1)}%` : '-'}
              </Descriptions.Item>
              <Descriptions.Item label="EV / BAC">
                {outsourcedMetrics ? `${outsourcedMetrics.evPercent.toFixed(1)}%` : '-'}
              </Descriptions.Item>
              <Descriptions.Item label="Remaining Payable = BAC - Paid">
                {outsourcedMetrics ? `${formatBaht(outsourcedMetrics.remainingPayable)} ฿` : '-'}
              </Descriptions.Item>
              <Descriptions.Item label="มุมมองเจ้าของโครงการ">
                ติดตามความก้าวหน้าและยอดเบิกจ่าย ไม่ใช่ต้นทุนภายในของผู้รับจ้าง
              </Descriptions.Item>
            </>
          )}
        </Descriptions>
      </Card>

      <Card
        title={isOutsourced ? 'งวดข้อมูลความก้าวหน้า/เบิกจ่าย (Contract Snapshots)' : 'งวดข้อมูล EVM (EVM Snapshots)'}
        extra={
          canManageEvm ? (
            <Button
              type="primary"
              onClick={() => setOpen(true)}
              style={{ backgroundColor: COLORS.accentTeal, borderColor: COLORS.accentTeal }}
            >
              {isOutsourced ? 'บันทึกงวดเบิกจ่ายใหม่' : 'บันทึกงวด EVM ใหม่'}
            </Button>
          ) : null
        }
      >
        <Table<EVMDataPoint>
          columns={evmColumns}
          dataSource={evmData ?? []}
          rowKey="id"
          pagination={false}
          locale={{ emptyText: isOutsourced ? 'ยังไม่มีข้อมูลงวดความก้าวหน้า/เบิกจ่าย' : 'ยังไม่มีข้อมูลงวด EVM' }}
        />
      </Card>

      {/* Section 6: Analysis Alert */}
      <Alert
        type={analysisAlertType}
        showIcon
        message="วิเคราะห์สถานะโครงการ (Project Analysis)"
        description={
          metrics
            ? metrics.mode === 'internal'
              ? `โครงการ${metrics.svPercent < 0 ? 'ช้ากว่าแผน' : 'เร็วกว่าแผน'} ${Math.abs(metrics.svPercent).toFixed(1)}% (SPI = ${metrics.spi.toFixed(2)}) และ${metrics.cvPercent < 0 ? 'เกินงบ' : 'ประหยัดงบ'} ${Math.abs(metrics.cvPercent).toFixed(1)}% (CPI = ${metrics.cpi.toFixed(2)}) โดยคาดว่าเมื่อปิดโครงการจะ${metrics.vac < 0 ? 'เกินงบ' : 'เหลืองบ'} ${formatBaht(Math.abs(Math.round(metrics.vac)))} บาท`
              : `มุมมองเจ้าของสัญญา: โครงการ${metrics.svPercent < 0 ? 'ช้ากว่าแผน' : 'เป็นไปตามแผน'} ${Math.abs(metrics.svPercent).toFixed(1)}% (SPI = ${metrics.spi.toFixed(2)}) ขณะนี้ตรวจรับมูลค่างาน ${formatBaht(metrics.ev)} บาท และจ่ายแล้ว ${formatBaht(metrics.paidToDate)} บาท ${metrics.paymentGap > 0 ? `ยังมีมูลค่างานรอจ่ายอีก ${formatBaht(metrics.paymentGap)} บาท` : metrics.paymentGap < 0 ? `โดยจ่ายนำหน้ามูลค่างาน ${formatBaht(Math.abs(metrics.paymentGap))} บาท` : 'มูลค่างานและยอดจ่ายสมดุล'}`
            : isOutsourced
              ? `สัญญานี้มีวงเงินรวม ${formatBaht(bac)} บาท แต่ยังไม่มีข้อมูลงวดความก้าวหน้า/เบิกจ่าย กรุณาบันทึกงวดแรกเพื่อเริ่มติดตาม PV, EV และ Paid to Date`
              : `โครงการนี้มีงบอนุมัติ ${formatBaht(bac)} บาท แต่ยังไม่มีข้อมูลงวด EVM สำหรับการวิเคราะห์ กรุณาบันทึกงวดแรกเพื่อเริ่มติดตาม PV, EV และ AC`
        }
        style={{ marginBottom: 24 }}
      />

      {/* Section 7: Action Buttons */}
      <Space size={12}>
        <Button icon={<FilePdfOutlined />} onClick={handleExportPdf}>Export PDF</Button>
        <Button icon={<FileExcelOutlined />} onClick={handleExportExcel}>Export Excel</Button>
        <Button
          type="primary"
          ghost
          icon={<UnorderedListOutlined />}
        >
          Drill-down ตามงวดงาน
        </Button>
      </Space>

      <Modal
        title={isOutsourced ? 'บันทึกงวดความก้าวหน้า/เบิกจ่ายใหม่' : 'บันทึกงวด EVM ใหม่'}
        open={open}
        onCancel={() => {
          setOpen(false);
          form.resetFields();
        }}
        onOk={handleCreate}
        okText="บันทึก"
        cancelText="ยกเลิก"
        confirmLoading={createEvmPoint.isPending}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            label="เดือน"
            name="month"
            rules={[{ required: true, message: 'กรุณาเลือกเดือน' }]}
          >
            <DatePicker
              picker="month"
              format="MM/YYYY"
              placeholder="เลือกเดือน"
              style={{ width: '100%' }}
            />
          </Form.Item>
          <Form.Item label="PV" name="pv" rules={[{ required: true, message: 'กรุณาระบุ PV' }]}>
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item label="EV" name="ev" rules={[{ required: true, message: 'กรุณาระบุ EV' }]}>
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item
            label={isOutsourced ? 'Paid to Date' : 'AC'}
            name="actualAmount"
            rules={[{ required: true, message: isOutsourced ? 'กรุณาระบุยอดจ่ายสะสม' : 'กรุณาระบุ AC' }]}
          >
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
