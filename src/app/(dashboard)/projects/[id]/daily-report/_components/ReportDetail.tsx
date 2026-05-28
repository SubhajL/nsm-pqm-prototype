'use client';

import Image from 'next/image';
import {
  Button,
  Card,
  Col,
  Divider,
  Grid,
  Progress,
  Row,
  Space,
  Table,
  Tag,
  Typography,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  CameraOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  EnvironmentOutlined,
} from '@ant-design/icons';

import { formatThaiDate, formatThaiDateShort } from '@/lib/date-utils';
import { COLORS } from '@/theme/antd-theme';
import type { DailyReport, DailyReportStatus } from '@/types/daily-report';
import { DAILY_REPORT_STATUS_LABELS } from '@/types/daily-report';

import { formatBytes, getWeatherIcon, STATUS_TAG_COLORS } from './helpers';

const { Title, Text } = Typography;

/* ============================================================ */
/* Report Detail Component                                      */
/* ============================================================ */

export function ReportDetail({
  report,
  currentUserName,
  canReview,
  statusUpdating,
  onStatusUpdate,
}: {
  report: DailyReport;
  currentUserName: string;
  canReview: boolean;
  statusUpdating: boolean;
  onStatusUpdate: (status: DailyReportStatus, note?: string) => Promise<void>;
}) {
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md;
  /* Personnel table columns */
  const personnelColumns: ColumnsType<{ type: string; count: number }> = [
    {
      title: 'ประเภท (Type)',
      dataIndex: 'type',
      key: 'type',
    },
    {
      title: 'จำนวน (Count)',
      dataIndex: 'count',
      key: 'count',
      width: 120,
      align: 'center',
      render: (v: number) => `${v} คน`,
    },
  ];

  /* Activity table columns */
  const activityColumns: ColumnsType<{
    task: string;
    quantity: number;
    unit: string;
    cumulativeProgress: number;
  }> = [
    {
      title: 'กิจกรรม (Task)',
      dataIndex: 'task',
      key: 'task',
    },
    {
      title: 'ปริมาณ (Qty)',
      dataIndex: 'quantity',
      key: 'quantity',
      width: 100,
      align: 'center',
    },
    {
      title: 'หน่วย (Unit)',
      dataIndex: 'unit',
      key: 'unit',
      width: 100,
      align: 'center',
    },
    {
      title: 'ความก้าวหน้าสะสม (Cumulative Progress)',
      dataIndex: 'cumulativeProgress',
      key: 'cumulativeProgress',
      width: 250,
      render: (val: number) => (
        <Progress
          percent={Math.round(val * 100)}
          size="small"
          strokeColor={COLORS.accentTeal}
        />
      ),
    },
  ];

  return (
    <Card
      title={`รายงานฉบับที่ ${report.reportNumber} — ${formatThaiDateShort(report.date)}`}
      style={{ marginTop: 24 }}
      styles={{ body: { padding: isMobile ? 16 : 24 } }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
        <Space wrap>
          <Tag color={STATUS_TAG_COLORS[report.status]}>
            {DAILY_REPORT_STATUS_LABELS[report.status].th} ({DAILY_REPORT_STATUS_LABELS[report.status].en})
          </Tag>
          <Text type="secondary">ผู้จัดทำ: {report.signatures.reporter.name || currentUserName || 'ไม่ระบุ'}</Text>
        </Space>
        <Space wrap>
          {(report.status === 'draft' || report.status === 'rejected') && !canReview ? (
            <Button
              type="primary"
              loading={statusUpdating}
              onClick={() => void onStatusUpdate('submitted', report.status === 'rejected' ? 'ส่งใหม่หลังแก้ไข' : 'ส่งอนุมัติรายงาน')}
            >
              {report.status === 'rejected' ? 'ส่งใหม่' : 'ส่งอนุมัติ'}
            </Button>
          ) : null}
          {report.status === 'submitted' && canReview ? (
            <>
              <Button
                type="primary"
                loading={statusUpdating}
                onClick={() => void onStatusUpdate('approved', 'อนุมัติรายงาน')}
              >
                อนุมัติรายงาน
              </Button>
              <Button
                danger
                loading={statusUpdating}
                onClick={() => void onStatusUpdate('rejected', 'ตีกลับรายงานเพื่อแก้ไข')}
              >
                ตีกลับรายงาน
              </Button>
            </>
          ) : null}
        </Space>
      </div>

      {/* Section 1: General Info */}
      <Title level={5} style={{ color: COLORS.primary }}>
        ข้อมูลทั่วไป (General Information)
      </Title>
      <Row gutter={[16, 16]} style={{ marginBottom: 8 }}>
        <Col xs={24} md={8}>
          <Text type="secondary">วันที่ (Date):</Text>{' '}
          <Text strong>{formatThaiDate(report.date)}</Text>
        </Col>
        <Col xs={24} md={8}>
          <Text type="secondary">สภาพอากาศ (Weather):</Text>{' '}
          {getWeatherIcon(report.weather)}
          <Text strong>
            {report.weather} — {report.temperature}&deg;C
          </Text>
        </Col>
        <Col xs={24} md={8}>
          <Text type="secondary">WBS:</Text>{' '}
          {report.linkedWbs.map((wbs) => (
            <Tag key={wbs} color="blue" style={{ marginBottom: 4 }}>
              {wbs}
            </Tag>
          ))}
        </Col>
      </Row>

      <Divider />

      {/* Section 2: Personnel */}
      <Title level={5} style={{ color: COLORS.primary }}>
        บุคลากรหน้างาน (On-site Personnel)
      </Title>
      <Table
        columns={personnelColumns}
        dataSource={report.personnel}
        rowKey="type"
        pagination={false}
        size="small"
        scroll={{ x: 520 }}
        style={{ marginBottom: 8 }}
        summary={() => (
          <Table.Summary.Row>
            <Table.Summary.Cell index={0}>
              <Text strong>รวมทั้งหมด (Total)</Text>
            </Table.Summary.Cell>
            <Table.Summary.Cell index={1} align="center">
              <Text strong>{report.totalPersonnel} คน</Text>
            </Table.Summary.Cell>
          </Table.Summary.Row>
        )}
      />

      <Divider />

      {/* Section 3: Activities / Progress */}
      <Title level={5} style={{ color: COLORS.primary }}>
        ความก้าวหน้าวันนี้ (Today&apos;s Progress)
      </Title>
      <Table
        columns={activityColumns}
        dataSource={report.activities}
        rowKey="task"
        pagination={false}
        size="small"
        scroll={{ x: 760 }}
      />

      <Divider />

      <Title level={5} style={{ color: COLORS.primary }}>
        ประวัติสถานะรายงาน
      </Title>
      <Space direction="vertical" size={12} style={{ width: '100%', marginBottom: 16 }}>
        {(report.statusHistory ?? []).slice().reverse().map((entry) => (
          <Card key={entry.id} size="small">
            <Space direction="vertical" size={2}>
              <Text strong>
                {DAILY_REPORT_STATUS_LABELS[entry.status].th} ({DAILY_REPORT_STATUS_LABELS[entry.status].en})
              </Text>
              <Text type="secondary">
                {entry.actorName} • {entry.actorRole} • {formatThaiDate(entry.timestamp)}
              </Text>
              {entry.note ? <Text>{entry.note}</Text> : null}
            </Space>
          </Card>
        ))}
      </Space>

      <Divider />

      {/* Section 4: Photos */}
      <Title level={5} style={{ color: COLORS.primary }}>
        ภาพถ่ายหน้างาน (Site Photos)
      </Title>
      <Row gutter={16}>
        {report.photos.map((photo) => (
          <Col key={photo.id} xs={12} sm={8} md={6}>
            <div
              style={{
                backgroundColor: COLORS.tableHeaderBg,
                borderRadius: 8,
                height: 160,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                border: `1px dashed ${COLORS.neutralGray}`,
                marginBottom: 16,
              }}
            >
              {photo.url ? (
                <Image
                  src={photo.url}
                  alt={photo.filename}
                  width={isMobile ? 220 : 320}
                  height={isMobile ? 144 : 192}
                  unoptimized
                  style={{
                    width: '100%',
                    height: 96,
                    objectFit: 'cover',
                    borderRadius: 8,
                    marginBottom: 8,
                  }}
                />
              ) : (
                <CameraOutlined style={{ fontSize: 32, color: COLORS.textDisabled, marginBottom: 8 }} />
              )}
              <Text
                type="secondary"
                style={{ fontSize: 12, textAlign: 'center', padding: '0 8px' }}
                ellipsis
              >
                {photo.filename}
              </Text>
              <Tag
                color="blue"
                style={{ marginTop: 8, fontSize: 11 }}
                icon={<EnvironmentOutlined />}
              >
                GPS
              </Tag>
              <Text
                type="secondary"
                style={{ fontSize: 10, marginTop: 4 }}
              >
                {photo.gpsLat.toFixed(4)}, {photo.gpsLng.toFixed(4)}
              </Text>
              <Text
                type="secondary"
                style={{ fontSize: 10 }}
              >
                {new Date(photo.timestamp).toLocaleTimeString('th-TH', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </Text>
              {photo.url ? (
                <a
                  href={photo.url}
                  target="_blank"
                  rel="noreferrer"
                  style={{ marginTop: 6, fontSize: 11 }}
                >
                  เปิดไฟล์ภาพ
                </a>
              ) : null}
            </div>
          </Col>
        ))}
        {/* Add an empty placeholder if fewer than 4 photos */}
        {report.photos.length < 4 && (
          <Col xs={12} sm={8} md={6}>
            <div
              style={{
                backgroundColor: COLORS.surfaceMuted,
                borderRadius: 8,
                height: 160,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                border: `1px dashed ${COLORS.neutralGray}`,
                marginBottom: 16,
              }}
            >
              <CameraOutlined style={{ fontSize: 32, color: COLORS.neutralGray, marginBottom: 8 }} />
              <Text type="secondary" style={{ fontSize: 12 }}>
                เพิ่มภาพ
              </Text>
            </div>
          </Col>
        )}
      </Row>

      <Divider />

      <Title level={5} style={{ color: COLORS.primary }}>
        เอกสารแนบ (Attachments)
      </Title>
      <Space direction="vertical" size={8} style={{ width: '100%', marginBottom: 16 }}>
        {report.attachments.length === 0 ? (
          <Text type="secondary">ไม่มีเอกสารแนบในรายงานฉบับนี้</Text>
        ) : (
          report.attachments.map((attachment) => (
            <Card key={attachment.id} size="small">
              <Space style={{ display: 'flex', justifyContent: 'space-between' }}>
                <Space direction="vertical" size={0}>
                  <Text strong>{attachment.filename}</Text>
                  <Text type="secondary">
                    {attachment.mimeType} • {formatBytes(attachment.sizeBytes)}
                  </Text>
                </Space>
                <a
                  href={attachment.url}
                  target="_blank"
                  rel="noreferrer"
                >
                  {attachment.filename}
                </a>
              </Space>
            </Card>
          ))
        )}
      </Space>

      <Divider />

      {/* Section 5: Issues */}
      <Title level={5} style={{ color: COLORS.primary }}>
        ปัญหาและอุปสรรค (Issues & Obstacles)
      </Title>
      <div
        style={{
          backgroundColor: report.issues === 'ไม่พบปัญหา' ? COLORS.successBg : COLORS.warningBg,
          border: `1px solid ${report.issues === 'ไม่พบปัญหา' ? COLORS.successBorder : COLORS.warningBorder}`,
          borderRadius: 8,
          padding: '12px 16px',
          marginBottom: 16,
        }}
      >
        <Text>{report.issues}</Text>
      </div>

      <Divider />

      {/* Section 6: Signatures */}
      <Title level={5} style={{ color: COLORS.primary }}>
        ลายเซ็น (Signatures)
      </Title>
      <Row gutter={24}>
        {/* Reporter */}
        <Col xs={24} md={12}>
          <div
            style={{
              border: `1px solid ${COLORS.borderLight}`,
              borderRadius: 8,
              padding: '16px 20px',
              display: 'flex',
              alignItems: 'center',
              gap: 12,
            }}
          >
            {report.signatures.reporter.signed ? (
              <CheckCircleOutlined
                style={{ fontSize: 28, color: COLORS.success }}
              />
            ) : (
              <ClockCircleOutlined
                style={{ fontSize: 28, color: COLORS.textDisabled }}
              />
            )}
            <div>
              <Text type="secondary" style={{ fontSize: 12 }}>
                ผู้รายงาน (Reporter)
              </Text>
              <div>
                <Text strong>{report.signatures.reporter.name || '—'}</Text>
              </div>
              <Text
                type="secondary"
                style={{ fontSize: 12 }}
              >
                {report.signatures.reporter.signed
                  ? 'ลงนามแล้ว (Signed)'
                  : 'รอลงนาม (Pending)'}
              </Text>
            </div>
          </div>
        </Col>

        {/* Inspector */}
        <Col xs={24} md={12}>
          <div
            style={{
              border: `1px solid ${COLORS.borderLight}`,
              borderRadius: 8,
              padding: '16px 20px',
              display: 'flex',
              alignItems: 'center',
              gap: 12,
            }}
          >
            {report.signatures.inspector.signed ? (
              <CheckCircleOutlined
                style={{ fontSize: 28, color: COLORS.success }}
              />
            ) : (
              <ClockCircleOutlined
                style={{ fontSize: 28, color: COLORS.textDisabled }}
              />
            )}
            <div>
              <Text type="secondary" style={{ fontSize: 12 }}>
                ผู้ตรวจสอบ (Inspector)
              </Text>
              <div>
                <Text strong>{report.signatures.inspector.name || '—'}</Text>
              </div>
              <Text
                type="secondary"
                style={{ fontSize: 12 }}
              >
                {report.signatures.inspector.signed
                  ? 'ลงนามแล้ว (Signed)'
                  : 'รอลงนาม (Pending)'}
              </Text>
            </div>
          </div>
        </Col>
      </Row>
    </Card>
  );
}
