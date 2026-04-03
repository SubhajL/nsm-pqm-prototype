'use client';

import { useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import {
  Alert,
  Button,
  Card,
  Col,
  Form,
  Input,
  InputNumber,
  Modal,
  Row,
  Skeleton,
  Statistic,
  Table,
  Tag,
  Typography,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  AlertOutlined,
  ExclamationCircleOutlined,
  FileExcelOutlined,
  FilePdfOutlined,
  PlusOutlined,
  SafetyCertificateOutlined,
  WarningOutlined,
} from '@ant-design/icons';

import { KPICard } from '@/components/common/KPICard';
import { useCreateRisk, useRisks } from '@/hooks/useRisks';
import { useProject } from '@/hooks/useProjects';
import { useRouteProjectId } from '@/hooks/useRouteProjectId';
import { buildRiskExcelDocument, buildRiskPdfDocument } from '@/lib/export-documents';
import { downloadSpreadsheetReport, openPrintableReport } from '@/lib/export-utils';
import { COLORS } from '@/theme/antd-theme';
import { formatThaiDate } from '@/lib/date-utils';
import type { Risk } from '@/types/risk';
import { RISK_LEVEL_LABELS, RISK_STATUS_LABELS } from '@/types/risk';
import { message } from 'antd';

const { Title } = Typography;
const { Search } = Input;
const EMPTY_RISKS: Risk[] = [];

const RiskHeatMap = dynamic(
  () => import('@/components/charts/RiskHeatMap').then((mod) => ({ default: mod.RiskHeatMap })),
  { ssr: false, loading: () => <Skeleton active paragraph={{ rows: 8 }} /> },
);

export default function RiskManagementPage() {
  const projectId = useRouteProjectId() ?? 'proj-001';
  const { data: project } = useProject(projectId);
  const { data: risks, isLoading } = useRisks(projectId);
  const createRisk = useCreateRisk(projectId);
  const [searchText, setSearchText] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createForm] = Form.useForm();

  const allRisks = useMemo(() => risks ?? EMPTY_RISKS, [risks]);

  const stats = useMemo(() => {
    const total = allRisks.length;
    const criticalHigh = allRisks.filter(
      (r) => r.level === 'critical' || r.level === 'high',
    ).length;
    const medium = allRisks.filter((r) => r.level === 'medium').length;
    const closed = allRisks.filter((r) => r.status === 'closed').length;
    const open = allRisks.filter((r) => r.status === 'open').length;
    const mitigating = allRisks.filter((r) => r.status === 'mitigating').length;
    return { total, criticalHigh, medium, closed, open, mitigating };
  }, [allRisks]);

  const filteredRisks = useMemo(() => {
    if (!searchText) return allRisks;
    const lower = searchText.toLowerCase();
    return allRisks.filter(
      (r) =>
        r.id.toLowerCase().includes(lower) ||
        r.title.toLowerCase().includes(lower) ||
        r.owner.toLowerCase().includes(lower),
    );
  }, [allRisks, searchText]);

  const handleCreateRisk = async () => {
    try {
      const values = await createForm.validateFields();
      await createRisk.mutateAsync(values);
      setIsCreateModalOpen(false);
      createForm.resetFields();
      message.success('บันทึกความเสี่ยงแล้ว');
    } catch (error) {
      if (error instanceof Error && error.message) {
        message.error(error.message);
      }
    }
  };

  const handleExportPdf = () => {
    const opened = openPrintableReport(
      buildRiskPdfDocument({ project, filteredRisks, stats, searchText }),
    );
    if (!opened) {
      message.error('ไม่สามารถเปิดหน้าต่างรายงานได้ กรุณาอนุญาต pop-up');
    }
  };

  const handleExportExcel = () => {
    downloadSpreadsheetReport(
      buildRiskExcelDocument({ project, filteredRisks, searchText }),
    );
    message.success('ส่งออกทะเบียนความเสี่ยงแล้ว');
  };

  const columns: ColumnsType<Risk> = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 80,
      sorter: (a, b) => a.id.localeCompare(b.id),
    },
    {
      title: 'หัวข้อ (Title)',
      dataIndex: 'title',
      key: 'title',
      ellipsis: true,
    },
    {
      title: 'ผลกระทบ (Impact)',
      dataIndex: 'impact',
      key: 'impact',
      width: 120,
      align: 'center',
      sorter: (a, b) => a.impact - b.impact,
    },
    {
      title: 'โอกาส (Likelihood)',
      dataIndex: 'likelihood',
      key: 'likelihood',
      width: 130,
      align: 'center',
      sorter: (a, b) => a.likelihood - b.likelihood,
    },
    {
      title: 'ระดับ (Level)',
      dataIndex: 'level',
      key: 'level',
      width: 160,
      align: 'center',
      sorter: (a, b) => a.score - b.score,
      render: (level: Risk['level']) => {
        const entry = RISK_LEVEL_LABELS[level];
        return <Tag color={entry.color}>{entry.th} ({entry.en})</Tag>;
      },
    },
    {
      title: 'สถานะ (Status)',
      dataIndex: 'status',
      key: 'status',
      width: 160,
      align: 'center',
      render: (status: Risk['status']) => {
        const entry = RISK_STATUS_LABELS[status];
        return <Tag color={entry.color}>{entry.th} ({entry.en})</Tag>;
      },
    },
    {
      title: 'ผู้รับผิดชอบ (Owner)',
      dataIndex: 'owner',
      key: 'owner',
      width: 140,
    },
    {
      title: 'วันที่พบ (Date)',
      dataIndex: 'dateIdentified',
      key: 'dateIdentified',
      width: 120,
      sorter: (a, b) => a.dateIdentified.localeCompare(b.dateIdentified),
      render: (date: string) => formatThaiDate(date),
    },
  ];

  if (isLoading) {
    return (
      <div>
        <Title level={3}>บริหารความเสี่ยง (Risk Management)</Title>
        <Card>
          <Skeleton active paragraph={{ rows: 10 }} />
        </Card>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Title Row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Title level={3} style={{ margin: 0 }}>
          บริหารความเสี่ยง (Risk Management)
        </Title>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => {
            createForm.setFieldsValue({
              title: '',
              description: '',
              likelihood: 3,
              impact: 3,
              owner: '',
              mitigation: '',
            });
            setIsCreateModalOpen(true);
          }}
          style={{ backgroundColor: COLORS.accentTeal, borderColor: COLORS.accentTeal }}
        >
          บันทึกความเสี่ยงใหม่
        </Button>
      </div>

      {/* KPI Cards */}
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} md={6}>
          <KPICard
            title="ความเสี่ยงทั้งหมด (Total Risks)"
            value={stats.total}
            icon={<AlertOutlined />}
            color={COLORS.info}
          />
        </Col>
        <Col xs={24} sm={12} md={6}>
          <KPICard
            title="วิกฤต/สูง (Critical/High)"
            value={stats.criticalHigh}
            icon={<ExclamationCircleOutlined />}
            color={COLORS.error}
          />
        </Col>
        <Col xs={24} sm={12} md={6}>
          <KPICard
            title="ปานกลาง (Medium)"
            value={stats.medium}
            icon={<WarningOutlined />}
            color={COLORS.warning}
          />
        </Col>
        <Col xs={24} sm={12} md={6}>
          <KPICard
            title="ปิดแล้ว (Closed)"
            value={stats.closed}
            icon={<SafetyCertificateOutlined />}
            color={COLORS.success}
          />
        </Col>
      </Row>

      {/* Risk Matrix + Trend Summary */}
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={14}>
          <Card
            title="Risk Matrix 5x5"
            style={{ borderRadius: 8, boxShadow: '0 2px 10px rgba(0,0,0,0.08)' }}
          >
            <RiskHeatMap risks={allRisks} height={400} />
          </Card>
        </Col>
        <Col xs={24} lg={10}>
          <Card
            title="Risk Summary"
            style={{ borderRadius: 8, boxShadow: '0 2px 10px rgba(0,0,0,0.08)', height: '100%' }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              <Statistic
                title="เปิด (Open)"
                value={stats.open}
                valueStyle={{ fontSize: 28, fontWeight: 600, color: COLORS.error }}
              />
              <Statistic
                title="กำลังจัดการ (Mitigating)"
                value={stats.mitigating}
                valueStyle={{ fontSize: 28, fontWeight: 600, color: COLORS.warning }}
              />
              <Statistic
                title="ปิดแล้ว (Closed)"
                value={stats.closed}
                valueStyle={{ fontSize: 28, fontWeight: 600, color: COLORS.success }}
              />
            </div>
            <Alert
              type="info"
              showIcon
              style={{ marginTop: 24 }}
              message="Risk Score = โอกาสเกิด x ผลกระทบ | สูงมาก >=16 | สูง 10-15 | ปานกลาง 5-9 | ต่ำ 1-4"
            />
          </Card>
        </Col>
      </Row>

      {/* Risk Register Table */}
      <Card
        title="ทะเบียนความเสี่ยง (Risk Register)"
        style={{ borderRadius: 8, boxShadow: '0 2px 10px rgba(0,0,0,0.08)' }}
        styles={{ body: { padding: '16px 24px' } }}
        extra={
          <div style={{ display: 'flex', gap: 8 }}>
            <Button icon={<FilePdfOutlined />} onClick={handleExportPdf}>Export PDF</Button>
            <Button icon={<FileExcelOutlined />} onClick={handleExportExcel}>Export Excel</Button>
          </div>
        }
      >
        <div style={{ marginBottom: 16 }}>
          <Search
            placeholder="ค้นหา ID, หัวข้อ, ผู้รับผิดชอบ..."
            allowClear
            onSearch={(value) => setSearchText(value)}
            onChange={(e) => setSearchText(e.target.value)}
            style={{ maxWidth: 400 }}
          />
        </div>
        <Table<Risk>
          columns={columns}
          dataSource={filteredRisks}
          rowKey="id"
          pagination={{ pageSize: 10 }}
          size="middle"
          scroll={{ x: 1000 }}
        />
      </Card>

      <Modal
        title="บันทึกความเสี่ยงใหม่"
        open={isCreateModalOpen}
        onCancel={() => setIsCreateModalOpen(false)}
        onOk={handleCreateRisk}
        okText="บันทึก"
        cancelText="ยกเลิก"
        confirmLoading={createRisk.isPending}
      >
        <Form form={createForm} layout="vertical">
          <Form.Item label="หัวข้อความเสี่ยง" name="title" rules={[{ required: true, message: 'กรุณาระบุหัวข้อ' }]}>
            <Input placeholder="เช่น ผู้รับเหมาส่งมอบล่าช้า" />
          </Form.Item>
          <Form.Item label="รายละเอียด" name="description">
            <Input.TextArea rows={3} />
          </Form.Item>
          <Form.Item label="โอกาสเกิด" name="likelihood" rules={[{ required: true, message: 'กรุณาระบุโอกาสเกิด' }]}>
            <InputNumber min={1} max={5} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item label="ผลกระทบ" name="impact" rules={[{ required: true, message: 'กรุณาระบุผลกระทบ' }]}>
            <InputNumber min={1} max={5} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item label="ผู้รับผิดชอบ" name="owner" rules={[{ required: true, message: 'กรุณาระบุผู้รับผิดชอบ' }]}>
            <Input placeholder="เช่น น.ส.วิภา ขจรศักดิ์" />
          </Form.Item>
          <Form.Item label="แนวทางจัดการ" name="mitigation">
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
