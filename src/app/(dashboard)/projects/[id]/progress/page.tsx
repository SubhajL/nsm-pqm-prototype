'use client';

import { useMemo, useState } from 'react';
import {
  Button,
  Card,
  Col,
  Empty,
  Progress,
  Row,
  Segmented,
  Skeleton,
  Table,
  Tag,
  Typography,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  CheckCircleOutlined,
  SaveOutlined,
  WarningOutlined,
} from '@ant-design/icons';

import { useEVM } from '@/hooks/useEVM';
import { useProject } from '@/hooks/useProjects';
import { useRouteProjectId } from '@/hooks/useRouteProjectId';
import { useWBS } from '@/hooks/useWBS';
import {
  buildPhysicalRows,
  buildWeightingRows,
  getAveragePhysicalProgress,
  getTotalWeightedProgress,
  type PhysicalProgressRow,
  type WeightingRow,
} from '@/lib/project-progress-derivations';
import { COLORS } from '@/theme/antd-theme';
import { formatBahtShort } from '@/lib/date-utils';
import { deriveEvmMetrics, getPaymentGapTone, getSpiTone } from '@/lib/evm-metrics';
import { getProjectExecutionModel } from '@/types/project';

const { Title, Text } = Typography;

interface EVMMetric {
  key: string;
  label: string;
  value: string;
  color: string;
  tag?: { color: string; icon: React.ReactNode; text: string };
}

type MethodTab = 'all' | 'weighting' | 'physical' | 'evm';

export default function ProgressUpdatePage() {
  const projectId = useRouteProjectId() ?? 'proj-001';
  const { data: project, isLoading: loadingProject } = useProject(projectId);
  const { data: wbsNodes, isLoading: loadingWbs } = useWBS(projectId);
  const { data: evmData, isLoading: loadingEvm } = useEVM(projectId);
  const [activeTab, setActiveTab] = useState<MethodTab>('all');

  const weightingRows = useMemo(() => buildWeightingRows(wbsNodes ?? []), [wbsNodes]);
  const totalWeighted = useMemo(
    () => getTotalWeightedProgress(weightingRows),
    [weightingRows],
  );
  const physicalRows = useMemo(
    () => buildPhysicalRows(wbsNodes ?? []),
    [wbsNodes],
  );
  const physicalOverall = useMemo(
    () => getAveragePhysicalProgress(physicalRows),
    [physicalRows],
  );
  const executionModel = getProjectExecutionModel(project);
  const evmSummary = useMemo(() => deriveEvmMetrics(project, evmData), [evmData, project]);
  const spiTone = getSpiTone(evmSummary?.spi ?? 0);
  const paymentGapTone = evmSummary?.mode === 'outsourced' ? getPaymentGapTone(evmSummary.paymentGap) : null;

  const evmMetrics = useMemo<EVMMetric[]>(
    () => {
      const bac = project?.budget ?? 0;

      if (!evmSummary) {
        return executionModel === 'outsourced'
          ? [
              { key: 'bac', label: 'BAC', value: formatBahtShort(bac), color: COLORS.info },
              { key: 'pv', label: 'PV', value: '-', color: COLORS.info },
              { key: 'ev', label: 'EV', value: '-', color: COLORS.success },
              { key: 'paid', label: 'Paid', value: '-', color: COLORS.success },
              { key: 'spi', label: 'SPI', value: '-', color: COLORS.warning },
              { key: 'remaining', label: 'Remaining', value: '-', color: COLORS.warning },
            ]
          : [
              { key: 'bac', label: 'BAC', value: formatBahtShort(bac), color: COLORS.info },
              { key: 'pv', label: 'PV', value: '-', color: COLORS.info },
              { key: 'ev', label: 'EV', value: '-', color: COLORS.success },
              { key: 'ac', label: 'AC', value: '-', color: COLORS.warning },
              { key: 'spi', label: 'SPI', value: '-', color: COLORS.warning },
              { key: 'cpi', label: 'CPI', value: '-', color: COLORS.warning },
            ];
      }

      if (evmSummary.mode === 'outsourced') {
        return [
          { key: 'bac', label: 'BAC', value: formatBahtShort(evmSummary.bac), color: COLORS.info },
          { key: 'pv', label: 'PV', value: formatBahtShort(evmSummary.pv), color: COLORS.info },
          { key: 'ev', label: 'EV', value: formatBahtShort(evmSummary.ev), color: COLORS.success },
          { key: 'paid', label: 'Paid', value: formatBahtShort(evmSummary.paidToDate), color: COLORS.success },
          {
            key: 'spi',
            label: 'SPI',
            value: evmSummary.spi.toFixed(2),
            color: spiTone.color === 'success' ? COLORS.success : COLORS.warning,
            tag:
              evmSummary.spi >= 1
                ? { color: 'green', icon: <CheckCircleOutlined />, text: 'ตามแผน (On Schedule)' }
                : { color: 'gold', icon: <WarningOutlined />, text: 'ช้ากว่าแผน (Behind Schedule)' },
          },
          {
            key: 'remaining',
            label: 'Remaining',
            value: formatBahtShort(evmSummary.remainingPayable),
            color: COLORS.warning,
            tag: {
              color: paymentGapTone?.color === 'warning' ? 'gold' : paymentGapTone?.color === 'success' ? 'green' : 'blue',
              icon: paymentGapTone?.color === 'warning' ? <WarningOutlined /> : <CheckCircleOutlined />,
              text: paymentGapTone?.summaryTh ?? 'สถานะการจ่ายเงิน',
            },
          },
        ];
      }

      return [
        { key: 'bac', label: 'BAC', value: formatBahtShort(evmSummary.bac), color: COLORS.info },
        { key: 'pv', label: 'PV', value: formatBahtShort(evmSummary.pv), color: COLORS.info },
        { key: 'ev', label: 'EV', value: formatBahtShort(evmSummary.ev), color: COLORS.success },
        { key: 'ac', label: 'AC', value: formatBahtShort(evmSummary.ac), color: COLORS.warning },
        {
          key: 'spi',
          label: 'SPI',
          value: evmSummary.spi.toFixed(2),
          color: evmSummary.spi >= 1 ? COLORS.success : COLORS.warning,
          tag:
            evmSummary.spi >= 1
              ? { color: 'green', icon: <CheckCircleOutlined />, text: 'ตามแผน (On Schedule)' }
              : { color: 'gold', icon: <WarningOutlined />, text: 'ล่าช้าเล็กน้อย (Slightly Behind)' },
        },
        {
          key: 'cpi',
          label: 'CPI',
          value: evmSummary.cpi.toFixed(2),
          color: evmSummary.cpi >= 1 ? COLORS.success : COLORS.warning,
          tag:
            evmSummary.cpi >= 1
              ? { color: 'green', icon: <CheckCircleOutlined />, text: 'ใช้งบได้ดี (Under Budget)' }
              : { color: 'gold', icon: <WarningOutlined />, text: 'ใช้จ่ายสูงกว่าแผน (Over Budget)' },
        },
        { key: 'eac', label: 'EAC', value: formatBahtShort(evmSummary.eac), color: COLORS.info },
        { key: 'tcpi', label: 'TCPI', value: evmSummary.tcpi.toFixed(2), color: COLORS.success },
      ];
    },
    [evmSummary, executionModel, paymentGapTone?.color, paymentGapTone?.summaryTh, project?.budget, spiTone.color],
  );

  if (loadingProject || loadingWbs || loadingEvm) {
    return (
      <div>
        <Title level={3}>อัปเดตความคืบหน้าโครงการ (Progress Update)</Title>
        <Row gutter={16}>
          {[1, 2, 3].map((i) => (
            <Col span={8} key={i}>
              <Card>
                <Skeleton active paragraph={{ rows: 8 }} />
              </Card>
            </Col>
          ))}
        </Row>
      </div>
    );
  }

  const showWeighting = activeTab === 'all' || activeTab === 'weighting';
  const showPhysical = activeTab === 'all' || activeTab === 'physical';
  const showEVM = activeTab === 'all' || activeTab === 'evm';
  const colSpan = activeTab === 'all' ? 8 : 24;

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <Title level={3} style={{ margin: 0 }}>
          อัปเดตความคืบหน้าโครงการ (Progress Update)
        </Title>
        <Text type="secondary" style={{ fontSize: 14 }}>
          ข้อมูลอ้างอิงจาก WBS, แผนงาน และ EVM ล่าสุด
        </Text>
      </div>

      <div style={{ marginBottom: 24 }}>
        <Segmented
          value={activeTab}
          onChange={(val) => setActiveTab(val as MethodTab)}
          options={[
            { label: 'ดูทั้ง 3 วิธี (All)', value: 'all' },
            { label: 'วิธีน้ำหนักงาน (Weighting)', value: 'weighting' },
            { label: 'วิธีเชิงปริมาณ (Physical)', value: 'physical' },
            { label: 'EVM', value: 'evm' },
          ]}
          size="large"
        />
      </div>

      <Row gutter={16} style={{ marginBottom: 24 }}>
        {showWeighting && (
          <Col span={colSpan}>
            <WeightingMethodCard rows={weightingRows} totalWeighted={totalWeighted} />
          </Col>
        )}

        {showPhysical && (
          <Col span={colSpan}>
            <PhysicalProgressCard rows={physicalRows} overall={physicalOverall} />
          </Col>
        )}

        {showEVM && (
          <Col span={colSpan}>
            <EVMCard
              metrics={evmMetrics}
              evmPercent={evmSummary?.evPercent ?? 0}
              executionModel={executionModel}
            />
          </Col>
        )}
      </Row>

      <SummaryCard
        totalWeighted={totalWeighted}
        physicalOverall={physicalOverall}
        evmPercent={evmSummary?.evPercent ?? 0}
      />
    </div>
  );
}

function WeightingMethodCard({
  rows,
  totalWeighted,
}: {
  rows: WeightingRow[];
  totalWeighted: number;
}) {
  const columns: ColumnsType<WeightingRow> = [
    { title: 'WBS', dataIndex: 'wbs', key: 'wbs', width: 60 },
    { title: 'กิจกรรม (Activity)', dataIndex: 'activity', key: 'activity' },
    {
      title: 'น้ำหนัก (%)',
      dataIndex: 'weight',
      key: 'weight',
      width: 90,
      align: 'center',
      render: (v: number) => `${v}%`,
    },
    {
      title: '% เสร็จ',
      dataIndex: 'completion',
      key: 'completion',
      width: 80,
      align: 'center',
      render: (v: number) => `${v.toFixed(2)}%`,
    },
    {
      title: 'Weighted',
      dataIndex: 'weighted',
      key: 'weighted',
      width: 90,
      align: 'center',
      render: (v: number) => (
        <Text strong style={{ color: COLORS.accentTeal }}>
          {v.toFixed(2)}%
        </Text>
      ),
    },
  ];

  return (
    <Card
      title="วิธีน้ำหนักงาน (Weighting Method)"
      styles={{ body: { padding: '16px' } }}
      style={{ height: '100%' }}
    >
      <Table<WeightingRow>
        columns={columns}
        dataSource={rows}
        rowKey="key"
        pagination={false}
        size="small"
        locale={{ emptyText: 'ยังไม่มีข้อมูล WBS สำหรับโครงการนี้' }}
        summary={() => (
          <Table.Summary.Row style={{ backgroundColor: '#f0f2f5' }}>
            <Table.Summary.Cell index={0} colSpan={2}>
              <Text strong>รวม (Total)</Text>
            </Table.Summary.Cell>
            <Table.Summary.Cell index={2} align="center">
              <Text strong>100%</Text>
            </Table.Summary.Cell>
            <Table.Summary.Cell index={3} align="center">
              <Text strong>—</Text>
            </Table.Summary.Cell>
            <Table.Summary.Cell index={4} align="center">
              <Text strong style={{ color: COLORS.accentTeal, fontSize: 15 }}>
                {totalWeighted.toFixed(2)}%
              </Text>
            </Table.Summary.Cell>
          </Table.Summary.Row>
        )}
      />
      <div style={{ marginTop: 20 }}>
        <Text type="secondary" style={{ fontSize: 12, marginBottom: 4, display: 'block' }}>
          ความก้าวหน้าถ่วงน้ำหนัก (Weighted Progress)
        </Text>
        <Progress
          percent={Number(totalWeighted.toFixed(2))}
          strokeColor={COLORS.accentTeal}
          format={(pct) => `${pct?.toFixed(2)}%`}
          size={['100%', 20]}
        />
      </div>
    </Card>
  );
}

function PhysicalProgressCard({
  rows,
  overall,
}: {
  rows: PhysicalProgressRow[];
  overall: number;
}) {
  return (
    <Card
      title="วิธีเชิงปริมาณ (Physical Progress)"
      styles={{ body: { padding: '16px' } }}
      style={{ height: '100%' }}
    >
      {rows.length === 0 ? (
        <Empty description="ยังไม่มีงานเชิงปริมาณที่ติดตามได้" />
      ) : (
        rows.map((item) => (
          <div key={item.key} style={{ marginBottom: 20 }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginBottom: 4,
              }}
            >
              <Text strong style={{ fontSize: 13 }}>
                {item.name}
              </Text>
              <Text type="secondary" style={{ fontSize: 12 }}>
                {item.actual.toLocaleString('th-TH')}/{item.planned.toLocaleString('th-TH')} {item.unit}
              </Text>
            </div>
            <Progress
              percent={Number(item.percent.toFixed(2))}
              strokeColor={COLORS.success}
              format={(pct) => `${pct}%`}
              size={['100%', 16]}
            />
          </div>
        ))
      )}

      <div
        style={{
          marginTop: 16,
          padding: '12px 16px',
          backgroundColor: '#f6ffed',
          border: `1px solid ${COLORS.success}`,
          borderRadius: 8,
          textAlign: 'center',
        }}
      >
        <Text type="secondary" style={{ fontSize: 12 }}>
          ความก้าวหน้าเชิงปริมาณเฉลี่ย (Average Physical Progress)
        </Text>
        <div>
          <Text strong style={{ fontSize: 24, color: COLORS.success }}>
            {overall.toFixed(1)}%
          </Text>
        </div>
      </div>
    </Card>
  );
}

function EVMCard({
  metrics,
  evmPercent,
  executionModel,
}: {
  metrics: EVMMetric[];
  evmPercent: number;
  executionModel: ReturnType<typeof getProjectExecutionModel>;
}) {
  return (
    <Card
      title={executionModel === 'outsourced' ? 'Contract Progress & Payment' : 'Earned Value Management (EVM)'}
      styles={{ body: { padding: '16px' } }}
      style={{ height: '100%' }}
    >
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: 12,
        }}
      >
        {metrics.map((metric) => (
          <div
            key={metric.key}
            style={{
              border: `1px solid ${COLORS.borderLight}`,
              borderRadius: 8,
              padding: '12px 16px',
              textAlign: 'center',
            }}
          >
            <Text type="secondary" style={{ fontSize: 11 }}>
              {metric.label}
            </Text>
            <div>
              <Text strong style={{ fontSize: 22, color: metric.color }}>
                {metric.value}
              </Text>
            </div>
            {metric.tag && (
              <Tag
                color={metric.tag.color}
                icon={metric.tag.icon}
                style={{ marginTop: 4, fontSize: 11 }}
              >
                {metric.tag.text}
              </Tag>
            )}
          </div>
        ))}
      </div>

      <div style={{ marginTop: 16 }}>
        <Text type="secondary" style={{ fontSize: 12, marginBottom: 4, display: 'block' }}>
          {executionModel === 'outsourced' ? 'EV/BAC Progress' : 'EV/BAC Progress'}
        </Text>
        <Progress
          percent={Number(evmPercent.toFixed(1))}
          strokeColor={COLORS.info}
          format={(pct) => `${pct}%`}
          size={['100%', 20]}
        />
      </div>
    </Card>
  );
}

function SummaryCard({
  totalWeighted,
  physicalOverall,
  evmPercent,
}: {
  totalWeighted: number;
  physicalOverall: number;
  evmPercent: number;
}) {
  return (
    <Card
      title="สรุปและเปรียบเทียบ (Summary & Comparison)"
      styles={{ body: { padding: '24px' } }}
    >
      <Row gutter={32} align="middle">
        <Col span={8}>
          <div style={{ textAlign: 'center', marginBottom: 8 }}>
            <Text strong style={{ fontSize: 14 }}>
              Weighting Method
            </Text>
          </div>
          <Progress
            percent={Number(totalWeighted.toFixed(2))}
            strokeColor={COLORS.accentTeal}
            format={(pct) => `${pct?.toFixed(2)}%`}
            size={['100%', 20]}
          />
        </Col>
        <Col span={8}>
          <div style={{ textAlign: 'center', marginBottom: 8 }}>
            <Text strong style={{ fontSize: 14 }}>
              Physical Progress
            </Text>
          </div>
          <Progress
            percent={Number(physicalOverall.toFixed(1))}
            strokeColor={COLORS.success}
            format={(pct) => `${pct}%`}
            size={['100%', 20]}
          />
        </Col>
        <Col span={8}>
          <div style={{ textAlign: 'center', marginBottom: 8 }}>
            <Text strong style={{ fontSize: 14 }}>
              EVM (EV/BAC)
            </Text>
          </div>
          <Progress
            percent={Number(evmPercent.toFixed(1))}
            strokeColor={COLORS.info}
            format={(pct) => `${pct}%`}
            size={['100%', 20]}
          />
        </Col>
      </Row>

      <div
        style={{
          marginTop: 20,
          padding: '12px 16px',
          backgroundColor: '#f5f7fa',
          borderRadius: 8,
          border: `1px solid ${COLORS.borderLight}`,
        }}
      >
        <Text type="secondary" style={{ fontSize: 13 }}>
          ระบบแสดงข้อมูลล่าสุดจาก WBS, งานเชิงปริมาณ และ EVM ของโครงการนี้
        </Text>
      </div>

      <div style={{ marginTop: 20, textAlign: 'right' }}>
        <Button
          type="primary"
          icon={<SaveOutlined />}
          size="large"
          style={{
            backgroundColor: COLORS.accentTeal,
            borderColor: COLORS.accentTeal,
          }}
        >
          บันทึกการอัปเดต (Save Update)
        </Button>
      </div>
    </Card>
  );
}
