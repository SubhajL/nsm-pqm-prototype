'use client';

import Image from 'next/image';
import { useMemo, useState } from 'react';
import {
  Button,
  Card,
  Col,
  DatePicker,
  Divider,
  Form,
  Grid,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Progress,
  Row,
  Select,
  Skeleton,
  Space,
  Upload,
  Switch,
  Table,
  Tag,
  Typography,
  message,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  CameraOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  CloudOutlined,
  DeleteOutlined,
  EnvironmentOutlined,
  EyeOutlined,
  MinusCircleOutlined,
  PaperClipOutlined,
  PlusOutlined,
  SunOutlined,
  UploadOutlined,
} from '@ant-design/icons';
import type { UploadFile } from 'antd/es/upload/interface';

import dayjs from 'dayjs';
import {
  useCreateDailyReport,
  useDailyReports,
  useUpdateDailyReportStatus,
} from '@/hooks/useDailyReports';
import { useRouteProjectId } from '@/hooks/useRouteProjectId';
import { useWBS } from '@/hooks/useWBS';
import { formatThaiDate, formatThaiDateShort } from '@/lib/date-utils';
import { useAuthStore } from '@/stores/useAuthStore';
import { COLORS } from '@/theme/antd-theme';
import type { DailyReport, DailyReportStatus } from '@/types/daily-report';
import { DAILY_REPORT_STATUS_LABELS } from '@/types/daily-report';
import { canReviewDailyReport } from '@/lib/auth';

const { Title, Text } = Typography;

interface DailyReportFormValues {
  date: dayjs.Dayjs;
  weather: string;
  temperature: number;
  linkedWbs: string[];
  personnel: Array<{ type: string; count: number }>;
  activities: Array<{
    wbsId?: string;
    task: string;
    quantity: number;
    unit: string;
    cumulativeProgress: number;
  }>;
  photoMetadata: Array<{
    gpsLat: number;
    gpsLng: number;
    timestamp: string;
  }>;
  issues?: string;
  reporterName: string;
  reporterSigned: boolean;
  inspectorName: string;
  inspectorSigned: boolean;
}

interface UploadQueueItem {
  uid: string;
  name: string;
  size: number;
  type: string;
  file: File;
}

const STATUS_TAG_COLORS: Record<DailyReportStatus, string> = {
  submitted: 'green',
  approved: 'green',
  draft: 'gold',
  rejected: 'red',
};

const STATUS_FILTER_OPTIONS = [
  { label: 'ทั้งหมด', value: 'all' },
  ...Object.entries(DAILY_REPORT_STATUS_LABELS).map(([value, label]) => ({
    label: `${label.th} (${label.en})`,
    value,
  })),
];

function getWeatherIcon(weather: string) {
  if (weather.includes('แดด') || weather.includes('Sunny')) {
    return <SunOutlined style={{ color: '#F39C12', marginRight: 6 }} />;
  }
  return <CloudOutlined style={{ color: '#95A5A6', marginRight: 6 }} />;
}

function normalizeUploadQueue(fileList: UploadFile[]): UploadQueueItem[] {
  return fileList
    .filter((file): file is UploadFile & { originFileObj: File } => !!file.originFileObj)
    .map((file) => ({
      uid: file.uid,
      name: file.name,
      size: file.size ?? file.originFileObj.size,
      type: file.type ?? file.originFileObj.type,
      file: file.originFileObj,
    }));
}

function formatBytes(sizeBytes: number) {
  if (sizeBytes >= 1024 * 1024) {
    return `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`;
  }
  if (sizeBytes >= 1024) {
    return `${Math.round(sizeBytes / 1024)} KB`;
  }
  return `${sizeBytes} B`;
}

export default function DailyReportPage() {
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md;
  const projectId = useRouteProjectId() ?? 'proj-001';
  const { data: reports, isLoading } = useDailyReports(projectId);
  const { data: wbsNodes } = useWBS(projectId);
  const createDailyReport = useCreateDailyReport();
  const updateDailyReportStatus = useUpdateDailyReportStatus();
  const currentUser = useAuthStore((s) => s.currentUser);
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [localSelectedReport, setLocalSelectedReport] = useState<DailyReport | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | DailyReportStatus>('all');
  const [photoFiles, setPhotoFiles] = useState<UploadQueueItem[]>([]);
  const [attachmentFiles, setAttachmentFiles] = useState<UploadQueueItem[]>([]);
  const [createForm] = Form.useForm<DailyReportFormValues>();

  const selectedReport =
    localSelectedReport?.id === selectedReportId
      ? localSelectedReport
      : reports?.find((r) => r.id === selectedReportId) ?? null;
  const reportStats = useMemo(() => {
    const allReports = reports ?? [];
    return {
      total: allReports.length,
      draft: allReports.filter((report) => report.status === 'draft').length,
      submitted: allReports.filter((report) => report.status === 'submitted').length,
      approved: allReports.filter((report) => report.status === 'approved').length,
      rejected: allReports.filter((report) => report.status === 'rejected').length,
    };
  }, [reports]);
  const filteredReports = useMemo(() => {
    const allReports = reports ?? [];
    const lowered = searchText.trim().toLowerCase();

    return allReports.filter((report) => {
      const matchesStatus = statusFilter === 'all' || report.status === statusFilter;
      const matchesSearch =
        lowered.length === 0 ||
        report.issues.toLowerCase().includes(lowered) ||
        String(report.reportNumber).includes(lowered) ||
        report.signatures.reporter.name.toLowerCase().includes(lowered);

      return matchesStatus && matchesSearch;
    });
  }, [reports, searchText, statusFilter]);
  const wbsOptions = useMemo(
    () =>
      (wbsNodes ?? [])
        .filter((node) => node.level > 0)
        .map((node) => ({
          label: `${node.code} ${node.name}`,
          value: node.id,
        })),
    [wbsNodes],
  );

  const handleCreateDailyReport = async () => {
    try {
      const values = await createForm.validateFields();
      const personnel = (values.personnel ?? []).filter(
        (entry) => entry?.type?.trim() && Number(entry.count) > 0,
      );
      const activities = (values.activities ?? [])
        .filter((entry) => entry?.task?.trim())
        .map((entry) => ({
          wbsId: entry.wbsId,
          task: entry.task.trim(),
          quantity: Number(entry.quantity) || 0,
          unit: entry.unit.trim(),
          cumulativeProgress: Math.min(
            1,
            Math.max(0, (Number(entry.cumulativeProgress) || 0) / 100),
          ),
        }));
      const photoMetadata = (values.photoMetadata ?? []).map((entry) => ({
        gpsLat: Number(entry.gpsLat) || 0,
        gpsLng: Number(entry.gpsLng) || 0,
        timestamp: entry.timestamp.trim(),
      }));
      const formData = new FormData();
      formData.append(
        'metadata',
        JSON.stringify({
          projectId,
          date: values.date.format('YYYY-MM-DD'),
          weather: values.weather,
          temperature: values.temperature,
          totalPersonnel: personnel.reduce((sum, entry) => sum + Number(entry.count || 0), 0),
          personnel,
          linkedWbs: values.linkedWbs ?? [],
          activities,
          photoMetadata,
          issues: values.issues || 'ไม่พบปัญหา',
          signatures: {
            reporter: {
              name: values.reporterName.trim(),
              signed: values.reporterSigned,
              timestamp: values.reporterSigned ? new Date().toISOString() : null,
            },
            inspector: {
              name: values.inspectorName.trim(),
              signed: values.inspectorSigned,
              timestamp: values.inspectorSigned ? new Date().toISOString() : null,
            },
          },
          status: 'draft',
        }),
      );
      photoFiles.forEach((photo) => {
        formData.append('photoFiles', photo.file, photo.name);
      });
      attachmentFiles.forEach((attachment) => {
        formData.append('attachmentFiles', attachment.file, attachment.name);
      });

      const createdReport = await createDailyReport.mutateAsync(formData);
      setIsCreateModalOpen(false);
      createForm.resetFields();
      setPhotoFiles([]);
      setAttachmentFiles([]);
      setSelectedReportId(createdReport.id);
      setLocalSelectedReport(createdReport);
      message.success('สร้างรายงานประจำวันแล้ว');
    } catch (error) {
      if (error instanceof Error && error.message) {
        message.error(error.message);
      }
    }
  };

  const handleStatusUpdate = async (status: DailyReportStatus, note?: string) => {
    if (!selectedReport) {
      return;
    }

    try {
      const updatedReport = await updateDailyReportStatus.mutateAsync({
        id: selectedReport.id,
        status,
        note,
      });
      setSelectedReportId(updatedReport.id);
      setLocalSelectedReport(updatedReport);
      message.success('อัปเดตสถานะรายงานแล้ว');
    } catch (error) {
      if (error instanceof Error && error.message) {
        message.error(error.message);
      }
    }
  };

  const columns: ColumnsType<DailyReport> = [
    {
      title: '#',
      dataIndex: 'reportNumber',
      key: 'reportNumber',
      width: 70,
      align: 'center',
    },
    {
      title: 'วันที่ (Date)',
      dataIndex: 'date',
      key: 'date',
      width: 140,
      render: (date: string) => formatThaiDate(date),
    },
    {
      title: 'สถานะ (Status)',
      dataIndex: 'status',
      key: 'status',
      width: 140,
      render: (status: DailyReportStatus) => {
        const label = DAILY_REPORT_STATUS_LABELS[status];
        return (
          <Tag color={STATUS_TAG_COLORS[status]}>
            {label.th} ({label.en})
          </Tag>
        );
      },
    },
    {
      title: 'บุคลากร (Personnel)',
      dataIndex: 'totalPersonnel',
      key: 'totalPersonnel',
      width: 120,
      align: 'center',
      render: (val: number) => `${val} คน`,
    },
    {
      title: 'ปัญหา (Issues)',
      dataIndex: 'issues',
      key: 'issues',
      ellipsis: true,
      render: (text: string) => (
        <Text
          style={{ maxWidth: 200 }}
          ellipsis={{ tooltip: text }}
        >
          {text}
        </Text>
      ),
    },
    {
      title: 'จัดการ (Action)',
      key: 'action',
      width: 100,
      align: 'center',
      render: (_: unknown, record: DailyReport) => (
        <Button
          type="link"
          icon={<EyeOutlined />}
          onClick={() => setSelectedReportId(record.id)}
          style={{ color: COLORS.info }}
        >
          ดู
        </Button>
      ),
    },
  ];

  if (isLoading) {
    return (
      <div>
        <Title level={3}>รายงานประจำวัน (Daily Reports)</Title>
        <Card>
          <Skeleton active paragraph={{ rows: 8 }} />
        </Card>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: isMobile ? 'stretch' : 'center',
          flexDirection: isMobile ? 'column' : 'row',
          gap: 12,
          marginBottom: 24,
        }}
      >
        <Title level={3} style={{ margin: 0 }}>
          รายงานประจำวัน (Daily Reports)
        </Title>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => {
            createForm.setFieldsValue({
              date: dayjs(),
              weather: 'แดดจัด (Sunny)',
              temperature: 32,
              linkedWbs: [],
              personnel: [],
              activities: [],
              photoMetadata: [],
              reporterName: currentUser?.name ?? '',
              reporterSigned: false,
              inspectorName: '',
              inspectorSigned: false,
              issues: '',
            });
            setPhotoFiles([]);
            setAttachmentFiles([]);
            setIsCreateModalOpen(true);
          }}
          style={{
            backgroundColor: COLORS.accentTeal,
            borderColor: COLORS.accentTeal,
            width: isMobile ? '100%' : undefined,
          }}
        >
          สร้างรายงานใหม่
        </Button>
      </div>

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Text type="secondary">รายงานทั้งหมด</Text>
            <Title level={3} style={{ margin: '8px 0 0' }}>{reportStats.total}</Title>
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Text type="secondary">ร่าง</Text>
            <Title level={3} style={{ margin: '8px 0 0', color: COLORS.warning }}>{reportStats.draft}</Title>
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Text type="secondary">รออนุมัติ</Text>
            <Title level={3} style={{ margin: '8px 0 0', color: COLORS.info }}>{reportStats.submitted}</Title>
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Text type="secondary">อนุมัติแล้ว</Text>
            <Title level={3} style={{ margin: '8px 0 0', color: COLORS.success }}>{reportStats.approved}</Title>
          </Card>
        </Col>
      </Row>

      {/* Report List Table */}
      <Card
        title="รายการรายงาน (Report List)"
        styles={{ body: { padding: isMobile ? 12 : '16px 24px' } }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            justifyContent: 'space-between',
            gap: 12,
            marginBottom: 16,
          }}
        >
          <Input
            placeholder="ค้นหาจากเลขที่รายงาน, ปัญหา, ผู้จัดทำ"
            value={searchText}
            onChange={(event) => setSearchText(event.target.value)}
            style={{ width: isMobile ? '100%' : 320 }}
          />
          <Select
            aria-label="สถานะรายงาน"
            value={statusFilter}
            options={STATUS_FILTER_OPTIONS}
            onChange={(value) => setStatusFilter(value)}
            style={{ width: isMobile ? '100%' : 240 }}
          />
        </div>
        <Table<DailyReport>
          columns={columns}
          dataSource={filteredReports}
          rowKey="id"
          pagination={{ pageSize: 10, showSizeChanger: false }}
          size="middle"
          scroll={{ x: 900 }}
          onRow={(record) => ({
            onClick: () => {
              setSelectedReportId(record.id);
              setLocalSelectedReport(null);
            },
            style: {
              cursor: 'pointer',
              backgroundColor:
                record.id === selectedReportId
                  ? 'rgba(0,184,148,0.06)'
                  : undefined,
            },
          })}
        />
      </Card>

      {/* Report Detail Section */}
      {selectedReport && (
        <ReportDetail
          report={selectedReport}
          currentUserName={currentUser?.name ?? ''}
          canReview={canReviewDailyReport(currentUser?.role)}
          statusUpdating={updateDailyReportStatus.isPending}
          onStatusUpdate={handleStatusUpdate}
        />
      )}

      <Modal
        title="สร้างรายงานประจำวัน"
        open={isCreateModalOpen}
        onCancel={() => {
          setIsCreateModalOpen(false);
          setPhotoFiles([]);
          setAttachmentFiles([]);
        }}
        onOk={handleCreateDailyReport}
        okText="บันทึก"
        cancelText="ยกเลิก"
        confirmLoading={createDailyReport.isPending}
        width={isMobile ? 'calc(100vw - 24px)' : 880}
        styles={{
          body: {
            maxHeight: isMobile ? '70vh' : undefined,
            overflowY: isMobile ? 'auto' : undefined,
            padding: isMobile ? 16 : 24,
          },
        }}
      >
        <Form form={createForm} layout="vertical">
          <Form.Item label="วันที่" name="date" rules={[{ required: true, message: 'กรุณาเลือกวันที่' }]}>
            <DatePicker aria-label="วันที่" style={{ width: '100%' }} format="DD/MM/YYYY" />
          </Form.Item>
          <Form.Item label="สภาพอากาศ" name="weather" rules={[{ required: true, message: 'กรุณาเลือกสภาพอากาศ' }]}>
            <Input aria-label="สภาพอากาศ" placeholder="เช่น แดดจัด (Sunny)" />
          </Form.Item>
          <Form.Item label="อุณหภูมิ" name="temperature" rules={[{ required: true, message: 'กรุณาระบุอุณหภูมิ' }]}>
            <InputNumber aria-label="อุณหภูมิ" min={0} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item label="WBS ที่เกี่ยวข้อง" name="linkedWbs">
            <Select
              mode="multiple"
              allowClear
              options={wbsOptions}
              placeholder="เลือก WBS ที่รายงานนี้เกี่ยวข้อง"
            />
          </Form.Item>
          <Divider orientation="left">บุคลากรที่ปฏิบัติงาน</Divider>
          <Form.List name="personnel">
            {(fields, { add, remove }) => (
              <Space direction="vertical" size={12} style={{ width: '100%' }}>
                {fields.map((field, index) => (
                  <Row gutter={12} key={field.key} align="middle">
                    <Col xs={24} sm={14}>
                      <Form.Item
                        {...field}
                        label={index === 0 ? 'ประเภทบุคลากร' : undefined}
                        name={[field.name, 'type']}
                        rules={[{ required: true, message: 'กรุณาระบุประเภทบุคลากร' }]}
                      >
                        <Input aria-label={`ประเภทบุคลากร ${index + 1}`} placeholder="เช่น วิศวกรสนาม" />
                      </Form.Item>
                    </Col>
                    <Col xs={18} sm={8}>
                      <Form.Item
                        {...field}
                        label={index === 0 ? 'จำนวนบุคลากร' : undefined}
                        name={[field.name, 'count']}
                        rules={[{ required: true, message: 'กรุณาระบุจำนวนบุคลากร' }]}
                      >
                        <InputNumber aria-label={`จำนวนบุคลากร ${index + 1}`} min={0} style={{ width: '100%' }} />
                      </Form.Item>
                    </Col>
                    <Col xs={6} sm={2}>
                      <Popconfirm title="ลบบุคลากรรายการนี้?" onConfirm={() => remove(field.name)}>
                        <Button aria-label={`ลบบุคลากร ${index + 1}`} icon={<MinusCircleOutlined />} />
                      </Popconfirm>
                    </Col>
                  </Row>
                ))}
                <Button onClick={() => add({ type: '', count: 0 })}>เพิ่มบุคลากร</Button>
              </Space>
            )}
          </Form.List>
          <Divider orientation="left">กิจกรรมที่ดำเนินงาน</Divider>
          <Form.List name="activities">
            {(fields, { add, remove }) => (
              <Space direction="vertical" size={12} style={{ width: '100%' }}>
                {fields.map((field, index) => (
                  <Card key={field.key} size="small">
                    <Row gutter={12}>
                      <Col span={24}>
                        <Form.Item
                          {...field}
                          label="ชื่อกิจกรรม"
                          name={[field.name, 'task']}
                          rules={[{ required: true, message: 'กรุณาระบุชื่อกิจกรรม' }]}
                        >
                          <Input aria-label={`ชื่อกิจกรรม ${index + 1}`} placeholder="เช่น ติดตั้งระบบไฟฟ้า" />
                        </Form.Item>
                      </Col>
                      <Col xs={24} sm={12}>
                        <Form.Item {...field} label="WBS กิจกรรม" name={[field.name, 'wbsId']}>
                          <Select
                            allowClear
                            options={wbsOptions}
                            aria-label={`WBS กิจกรรม ${index + 1}`}
                            placeholder="เชื่อมโยงกับ WBS"
                          />
                        </Form.Item>
                      </Col>
                      <Col xs={12} sm={6}>
                        <Form.Item
                          {...field}
                          label="ปริมาณงาน"
                          name={[field.name, 'quantity']}
                          rules={[{ required: true, message: 'กรุณาระบุปริมาณ' }]}
                        >
                          <InputNumber aria-label={`ปริมาณงาน ${index + 1}`} min={0} style={{ width: '100%' }} />
                        </Form.Item>
                      </Col>
                      <Col xs={12} sm={6}>
                        <Form.Item
                          {...field}
                          label="หน่วยงานกิจกรรม"
                          name={[field.name, 'unit']}
                          rules={[{ required: true, message: 'กรุณาระบุหน่วย' }]}
                        >
                          <Input aria-label={`หน่วยงานกิจกรรม ${index + 1}`} placeholder="เช่น ตร.ม." />
                        </Form.Item>
                      </Col>
                      <Col xs={24} sm={10}>
                        <Form.Item
                          {...field}
                          label="ความก้าวหน้าสะสม"
                          name={[field.name, 'cumulativeProgress']}
                          rules={[{ required: true, message: 'กรุณาระบุความก้าวหน้า' }]}
                        >
                          <InputNumber
                            aria-label={`ความก้าวหน้าสะสม ${index + 1}`}
                            min={0}
                            max={100}
                            style={{ width: '100%' }}
                            addonAfter="%"
                          />
                        </Form.Item>
                      </Col>
                      <Col xs={24} sm={14} style={{ display: 'flex', alignItems: 'end', justifyContent: isMobile ? 'flex-start' : 'flex-end' }}>
                        <Button aria-label={`ลบกิจกรรม ${index + 1}`} icon={<MinusCircleOutlined />} onClick={() => remove(field.name)}>
                          ลบกิจกรรม
                        </Button>
                      </Col>
                    </Row>
                  </Card>
                ))}
                <Button onClick={() => add({ task: '', quantity: 0, unit: '', cumulativeProgress: 0 })}>
                  เพิ่มกิจกรรม
                </Button>
              </Space>
            )}
          </Form.List>
          <Divider orientation="left">ภาพถ่ายหน้างาน</Divider>
          <div style={{ marginBottom: 16 }}>
            <Upload
              multiple
              accept="image/*"
              beforeUpload={() => false}
              fileList={photoFiles.map((file) => ({
                uid: file.uid,
                name: file.name,
                size: file.size,
                type: file.type,
              }))}
              onChange={({ fileList }) => {
                const nextFiles = normalizeUploadQueue(fileList);
                const previousMetadata = createForm.getFieldValue('photoMetadata') ?? [];
                createForm.setFieldValue(
                  'photoMetadata',
                  nextFiles.map((_, index) => previousMetadata[index] ?? {
                    gpsLat: 13.7563,
                    gpsLng: 100.5018,
                    timestamp: dayjs().format('YYYY-MM-DDTHH:mm:ss'),
                  }),
                );
                setPhotoFiles(nextFiles);
              }}
              onRemove={(file) => {
                const nextFiles = photoFiles.filter((item) => item.uid !== file.uid);
                const nextMetadata = (createForm.getFieldValue('photoMetadata') ?? []).filter(
                  (_entry: DailyReportFormValues['photoMetadata'][number], index: number) =>
                    nextFiles[index] !== undefined,
                );
                createForm.setFieldValue('photoMetadata', nextMetadata);
                setPhotoFiles(nextFiles);
              }}
            >
              <Button icon={<UploadOutlined />}>เลือกภาพถ่ายจริง</Button>
            </Upload>
            <input
              data-testid="daily-report-photo-upload"
              type="file"
              accept="image/*"
              multiple
              style={{ display: 'none' }}
              onChange={(event) => {
                const nextFiles = Array.from(event.target.files ?? []).map((file, index) => ({
                  uid: `${file.name}-${file.lastModified}-${index}`,
                  name: file.name,
                  size: file.size,
                  type: file.type,
                  file,
                }));
                const previousMetadata = createForm.getFieldValue('photoMetadata') ?? [];
                createForm.setFieldValue(
                  'photoMetadata',
                  nextFiles.map((_, index) => previousMetadata[index] ?? {
                    gpsLat: 13.7563,
                    gpsLng: 100.5018,
                    timestamp: dayjs().format('YYYY-MM-DDTHH:mm:ss'),
                  }),
                );
                setPhotoFiles(nextFiles);
              }}
            />
          </div>
          <Form.List name="photoMetadata">
            {(fields, { remove }) => (
              <Space direction="vertical" size={12} style={{ width: '100%' }}>
                {fields.map((field, index) => (
                  <Card key={field.key} size="small">
                    <Row gutter={12}>
                      <Col xs={24} sm={12}>
                        <Text strong>{photoFiles[index]?.name ?? `ภาพถ่าย ${index + 1}`}</Text>
                        <div>
                          <Text type="secondary">{photoFiles[index] ? formatBytes(photoFiles[index].size) : 'ยังไม่เลือกไฟล์'}</Text>
                        </div>
                      </Col>
                      <Col xs={12} sm={6}>
                        <Form.Item
                          {...field}
                          label="ละติจูดภาพ"
                          name={[field.name, 'gpsLat']}
                          rules={[{ required: true, message: 'กรุณาระบุละติจูด' }]}
                        >
                          <InputNumber aria-label={`ละติจูดภาพ ${index + 1}`} style={{ width: '100%' }} />
                        </Form.Item>
                      </Col>
                      <Col xs={12} sm={6}>
                        <Form.Item
                          {...field}
                          label="ลองจิจูดภาพ"
                          name={[field.name, 'gpsLng']}
                          rules={[{ required: true, message: 'กรุณาระบุลองจิจูด' }]}
                        >
                          <InputNumber aria-label={`ลองจิจูดภาพ ${index + 1}`} style={{ width: '100%' }} />
                        </Form.Item>
                      </Col>
                      <Col xs={24} sm={18}>
                        <Form.Item
                          {...field}
                          label="เวลาถ่ายภาพ"
                          name={[field.name, 'timestamp']}
                          rules={[{ required: true, message: 'กรุณาระบุเวลาถ่ายภาพ' }]}
                        >
                          <Input aria-label={`เวลาถ่ายภาพ ${index + 1}`} placeholder="YYYY-MM-DDTHH:mm:ss" />
                        </Form.Item>
                      </Col>
                      <Col xs={24} sm={6} style={{ display: 'flex', alignItems: 'end', justifyContent: isMobile ? 'flex-start' : 'flex-end' }}>
                        <Button
                          aria-label={`ลบภาพ ${index + 1}`}
                          icon={<MinusCircleOutlined />}
                          onClick={() => {
                            remove(field.name);
                            setPhotoFiles((current) => current.filter((_entry, currentIndex) => currentIndex !== index));
                          }}
                        >
                          ลบภาพ
                        </Button>
                      </Col>
                    </Row>
                  </Card>
                ))}
                {fields.length === 0 ? <Text type="secondary">ยังไม่ได้เลือกภาพถ่าย</Text> : null}
              </Space>
            )}
          </Form.List>
          <Divider orientation="left">เอกสารแนบ</Divider>
          <div style={{ marginBottom: 16 }}>
            <Upload
              multiple
              beforeUpload={() => false}
              fileList={attachmentFiles.map((file) => ({
                uid: file.uid,
                name: file.name,
                size: file.size,
                type: file.type,
              }))}
              onChange={({ fileList }) => setAttachmentFiles(normalizeUploadQueue(fileList))}
            >
              <Button icon={<PaperClipOutlined />}>เลือกเอกสารแนบจริง</Button>
            </Upload>
            <input
              data-testid="daily-report-attachment-upload"
              type="file"
              multiple
              style={{ display: 'none' }}
              onChange={(event) => {
                const nextFiles = Array.from(event.target.files ?? []).map((file, index) => ({
                  uid: `${file.name}-${file.lastModified}-${index}`,
                  name: file.name,
                  size: file.size,
                  type: file.type,
                  file,
                }));
                setAttachmentFiles(nextFiles);
              }}
            />
          </div>
          <Space direction="vertical" size={8} style={{ width: '100%', marginBottom: 16 }}>
            {attachmentFiles.length === 0 ? (
              <Text type="secondary">ยังไม่ได้เลือกเอกสารแนบ</Text>
            ) : (
              attachmentFiles.map((file, index) => (
                <Card key={file.uid} size="small">
                  <Space style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                    <Space direction="vertical" size={0}>
                      <Text strong>{file.name}</Text>
                      <Text type="secondary">{formatBytes(file.size)}</Text>
                    </Space>
                    <Button
                      danger
                      icon={<DeleteOutlined />}
                      onClick={() =>
                        setAttachmentFiles((current) =>
                          current.filter((_entry, currentIndex) => currentIndex !== index),
                        )
                      }
                    >
                      ลบ
                    </Button>
                  </Space>
                </Card>
              ))
            )}
          </Space>
          <Divider orientation="left">ลายเซ็น</Divider>
          <Row gutter={12}>
            <Col xs={24} sm={12}>
              <Form.Item label="ผู้จัดทำรายงาน" name="reporterName" rules={[{ required: true, message: 'กรุณาระบุผู้จัดทำ' }]}>
                <Input aria-label="ผู้จัดทำรายงาน" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item label="ผู้ตรวจสอบ" name="inspectorName" rules={[{ required: true, message: 'กรุณาระบุผู้ตรวจสอบ' }]}>
                <Input aria-label="ผู้ตรวจสอบ" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item label="ผู้จัดทำลงนาม" name="reporterSigned" valuePropName="checked">
                <Switch aria-label="ผู้จัดทำลงนาม" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item label="ผู้ตรวจสอบลงนาม" name="inspectorSigned" valuePropName="checked">
                <Switch aria-label="ผู้ตรวจสอบลงนาม" />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item label="ปัญหา/อุปสรรค" name="issues">
            <Input.TextArea aria-label="ปัญหา/อุปสรรค" rows={3} placeholder="เช่น ไม่พบปัญหา" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

/* ============================================================ */
/* Report Detail Component                                      */
/* ============================================================ */

function ReportDetail({
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
                backgroundColor: '#f0f2f5',
                borderRadius: 8,
                height: 160,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1px dashed #d9d9d9',
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
                <CameraOutlined style={{ fontSize: 32, color: '#bfbfbf', marginBottom: 8 }} />
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
                backgroundColor: '#fafafa',
                borderRadius: 8,
                height: 160,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1px dashed #d9d9d9',
                marginBottom: 16,
              }}
            >
              <CameraOutlined style={{ fontSize: 32, color: '#d9d9d9', marginBottom: 8 }} />
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
          backgroundColor: report.issues === 'ไม่พบปัญหา' ? '#f6ffed' : '#fff7e6',
          border: `1px solid ${report.issues === 'ไม่พบปัญหา' ? '#b7eb8f' : '#ffd591'}`,
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
                style={{ fontSize: 28, color: '#bfbfbf' }}
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
                style={{ fontSize: 28, color: '#bfbfbf' }}
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
