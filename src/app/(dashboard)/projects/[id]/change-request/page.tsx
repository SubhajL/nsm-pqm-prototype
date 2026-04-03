'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Button,
  Card,
  Col,
  Descriptions,
  Form,
  Input,
  List,
  message,
  Modal,
  Row,
  Select,
  Steps,
  Table,
  Tag,
  Typography,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  ArrowUpOutlined,
  DownloadOutlined,
  FileOutlined,
  PlusOutlined,
} from '@ant-design/icons';

import {
  useChangeRequests,
  useCreateChangeRequest,
  useUpdateChangeRequestStatus,
} from '@/hooks/useChangeRequests';
import { useRouteProjectId } from '@/hooks/useRouteProjectId';
import { COLORS } from '@/theme/antd-theme';
import { formatBaht, formatThaiDate } from '@/lib/date-utils';
import type { ChangeRequest } from '@/types/document';
import { CR_PRIORITY_LABELS, CR_STATUS_LABELS } from '@/types/document';

const { Title, Text } = Typography;

interface ChangeRequestFormValues {
  title: string;
  reason: string;
  budgetImpact: number;
  scheduleImpact: number;
  linkedWbs: string;
  priority: ChangeRequest['priority'];
}

export default function ChangeRequestPage() {
  const projectId = useRouteProjectId() ?? 'proj-001';
  const { data: changeRequests, isLoading } = useChangeRequests(projectId);
  const createChangeRequest = useCreateChangeRequest(projectId);
  const updateStatus = useUpdateChangeRequestStatus(projectId);
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedChangeRequestId, setSelectedChangeRequestId] = useState<string>('');
  const [form] = Form.useForm<ChangeRequestFormValues>();

  const allChangeRequests = useMemo(() => changeRequests ?? [], [changeRequests]);

  useEffect(() => {
    if (allChangeRequests.length === 0) {
      setSelectedChangeRequestId('');
      return;
    }

    setSelectedChangeRequestId((current) => {
      if (current && allChangeRequests.some((entry) => entry.id === current)) {
        return current;
      }

      const pending = allChangeRequests.find((entry) => entry.status === 'pending');
      return pending?.id ?? allChangeRequests[0]?.id ?? '';
    });
  }, [allChangeRequests]);

  const selectedChangeRequest = useMemo(
    () =>
      allChangeRequests.find((entry) => entry.id === selectedChangeRequestId) ??
      allChangeRequests.find((entry) => entry.status === 'pending') ??
      allChangeRequests[0] ??
      null,
    [allChangeRequests, selectedChangeRequestId],
  );

  const summary = useMemo(() => {
    const total = allChangeRequests.length;
    const approved = allChangeRequests.filter((cr) => cr.status === 'approved').length;
    const pending = allChangeRequests.filter((cr) => cr.status === 'pending').length;
    const rejected = allChangeRequests.filter((cr) => cr.status === 'rejected').length;
    const totalBudgetImpact = allChangeRequests.reduce((sum, cr) => sum + cr.budgetImpact, 0);
    return { total, approved, pending, rejected, totalBudgetImpact };
  }, [allChangeRequests]);

  const workflowSteps = useMemo(() => {
    if (!selectedChangeRequest) return { items: [], current: 0 };

    const items = selectedChangeRequest.workflow.map((step) => {
      let status: 'finish' | 'process' | 'wait' | 'error' = 'wait';
      if (step.status === 'done') status = 'finish';
      else if (step.status === 'current') status = 'process';
      else if (step.status === 'rejected') status = 'error';

      return {
        title: step.step,
        description: (
          <span>
            {step.user}
            {step.date ? ` — ${formatThaiDate(step.date)}` : ''}
          </span>
        ),
        status,
      };
    });

    const current = selectedChangeRequest.workflow.findIndex((step) => step.status === 'current');
    return { items, current: current >= 0 ? current : 0 };
  }, [selectedChangeRequest]);

  const columns: ColumnsType<ChangeRequest> = [
    {
      title: 'CR#',
      dataIndex: 'id',
      key: 'id',
      width: 120,
    },
    {
      title: 'หัวข้อ (Title)',
      dataIndex: 'title',
      key: 'title',
      ellipsis: true,
    },
    {
      title: 'สถานะ (Status)',
      dataIndex: 'status',
      key: 'status',
      width: 180,
      align: 'center',
      render: (status: ChangeRequest['status']) => {
        const entry = CR_STATUS_LABELS[status];
        return <Tag color={entry.color}>{entry.label}</Tag>;
      },
    },
    {
      title: 'ผลกระทบงบ (Budget Impact)',
      dataIndex: 'budgetImpact',
      key: 'budgetImpact',
      width: 180,
      align: 'right',
      render: (value: number) => (
        <span
          style={{
            color: value > 0 ? COLORS.error : value < 0 ? COLORS.success : undefined,
            fontWeight: 500,
          }}
        >
          {value > 0 ? '+' : ''}
          {formatBaht(value)} ฿
        </span>
      ),
    },
    {
      title: 'วันที่ (Date)',
      dataIndex: 'requestedAt',
      key: 'requestedAt',
      width: 140,
      render: (date: string) => formatThaiDate(date),
    },
  ];

  const handleCreate = async () => {
    try {
      const values = await form.validateFields();
      const created = (await createChangeRequest.mutateAsync(values)) as ChangeRequest;
      setCreateOpen(false);
      form.resetFields();
      setSelectedChangeRequestId(created.id);
      message.success(`สร้าง Change Request ${created.id} แล้ว`);
    } catch (error) {
      if (error instanceof Error) {
        message.error(error.message);
      }
    }
  };

  const handleStatusAction = async (action: 'approve' | 'reject' | 'return') => {
    if (!selectedChangeRequest) return;

    try {
      await updateStatus.mutateAsync({ id: selectedChangeRequest.id, action });
      message.success(
        action === 'approve'
          ? `อนุมัติ Change Request ${selectedChangeRequest.id} เรียบร้อยแล้ว`
          : `อัปเดตสถานะ Change Request ${selectedChangeRequest.id} แล้ว`,
      );
    } catch (error) {
      message.error(error instanceof Error ? error.message : 'ไม่สามารถอัปเดตสถานะได้');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
        <Title level={3} style={{ margin: 0 }}>
          คำขอเปลี่ยนแปลง (Change Requests)
        </Title>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => setCreateOpen(true)}
          style={{ backgroundColor: COLORS.accentTeal, borderColor: COLORS.accentTeal }}
        >
          สร้าง Change Request
        </Button>
      </div>

      {selectedChangeRequest && (
        <Card
          title={
            <span>
              Change Request {selectedChangeRequest.id}
              <Tag
                color={CR_STATUS_LABELS[selectedChangeRequest.status].color}
                style={{ marginLeft: 8 }}
              >
                {CR_STATUS_LABELS[selectedChangeRequest.status].label}
              </Tag>
            </span>
          }
          style={{ borderRadius: 8, boxShadow: '0 2px 10px rgba(0,0,0,0.08)' }}
        >
          <Descriptions bordered column={{ xs: 1, sm: 2 }} size="middle">
            <Descriptions.Item label="หัวข้อ (Title)" span={2}>
              {selectedChangeRequest.title}
            </Descriptions.Item>
            <Descriptions.Item label="เหตุผล (Reason)" span={2}>
              {selectedChangeRequest.reason}
            </Descriptions.Item>
            <Descriptions.Item label="ผลกระทบงบประมาณ (Budget Impact)">
              <span
                style={{
                  color:
                    selectedChangeRequest.budgetImpact > 0 ? COLORS.error : COLORS.success,
                  fontWeight: 600,
                }}
              >
                {selectedChangeRequest.budgetImpact > 0 ? (
                  <ArrowUpOutlined style={{ marginRight: 4 }} />
                ) : null}
                {selectedChangeRequest.budgetImpact > 0 ? '+' : ''}
                {formatBaht(selectedChangeRequest.budgetImpact)} ฿
              </span>
            </Descriptions.Item>
            <Descriptions.Item label="ผลกระทบเวลา (Schedule Impact)">
              <span style={{ color: COLORS.warning, fontWeight: 600 }}>
                +{selectedChangeRequest.scheduleImpact} วัน
              </span>
            </Descriptions.Item>
            <Descriptions.Item label="เชื่อมโยง WBS (Linked WBS)">
              {selectedChangeRequest.linkedWbs}
            </Descriptions.Item>
            <Descriptions.Item label="ระดับความสำคัญ (Priority)">
              <Tag color={CR_PRIORITY_LABELS[selectedChangeRequest.priority].color}>
                {CR_PRIORITY_LABELS[selectedChangeRequest.priority].label}
              </Tag>
            </Descriptions.Item>
          </Descriptions>

          <div style={{ marginTop: 24 }}>
            <Text strong style={{ fontSize: 14, display: 'block', marginBottom: 12 }}>
              เอกสารแนบ (Attachments)
            </Text>
            <List
              size="small"
              bordered
              dataSource={selectedChangeRequest.attachments}
              locale={{ emptyText: 'ยังไม่มีเอกสารแนบ' }}
              renderItem={(item) => (
                <List.Item
                  actions={[
                    <Button key="download" type="link" icon={<DownloadOutlined />} size="small">
                      ดาวน์โหลด
                    </Button>,
                  ]}
                >
                  <span>
                    <FileOutlined style={{ marginRight: 8, color: COLORS.info }} />
                    {item}
                  </span>
                </List.Item>
              )}
            />
          </div>

          <div style={{ marginTop: 24 }}>
            <Text strong style={{ fontSize: 14, display: 'block', marginBottom: 16 }}>
              ขั้นตอนอนุมัติ (Approval Workflow)
            </Text>
            <Steps
              current={workflowSteps.current}
              items={workflowSteps.items.map((item) => ({
                title: item.title,
                description: item.description,
                status: item.status,
              }))}
            />
          </div>
        </Card>
      )}

      <Card
        title="ประวัติ Change Requests ทั้งหมด"
        style={{ borderRadius: 8, boxShadow: '0 2px 10px rgba(0,0,0,0.08)' }}
        styles={{ body: { padding: '16px 24px' } }}
      >
        <Table<ChangeRequest>
          columns={columns}
          dataSource={allChangeRequests}
          rowKey="id"
          loading={isLoading}
          pagination={false}
          size="middle"
          scroll={{ x: 800 }}
          onRow={(record) => ({
            onClick: () => setSelectedChangeRequestId(record.id),
          })}
        />
      </Card>

      <Card
        style={{
          borderRadius: 8,
          boxShadow: '0 2px 10px rgba(0,0,0,0.08)',
          background: '#f8f9fa',
        }}
        styles={{ body: { padding: '12px 24px' } }}
      >
        <Row gutter={[16, 8]} align="middle">
          <Col>
            <Text strong>CR ทั้งหมด: {summary.total}</Text>
          </Col>
          <Col>
            <Text>|</Text>
          </Col>
          <Col>
            <Text>
              อนุมัติ: <span style={{ color: COLORS.success, fontWeight: 600 }}>{summary.approved}</span>
            </Text>
          </Col>
          <Col>
            <Text>|</Text>
          </Col>
          <Col>
            <Text>
              รออนุมัติ: <span style={{ color: COLORS.warning, fontWeight: 600 }}>{summary.pending}</span>
            </Text>
          </Col>
          <Col>
            <Text>|</Text>
          </Col>
          <Col>
            <Text>
              ไม่อนุมัติ: <span style={{ color: COLORS.error, fontWeight: 600 }}>{summary.rejected}</span>
            </Text>
          </Col>
          <Col>
            <Text>|</Text>
          </Col>
          <Col>
            <Text>
              ผลกระทบงบรวม:{' '}
              <span style={{ color: summary.totalBudgetImpact > 0 ? COLORS.error : COLORS.success, fontWeight: 600 }}>
                {summary.totalBudgetImpact > 0 ? '+' : ''}
                {formatBaht(summary.totalBudgetImpact)} บาท
              </span>
            </Text>
          </Col>
        </Row>
      </Card>

      {selectedChangeRequest && (
        <Row justify="end" gutter={[12, 12]}>
          <Col>
            <Button
              danger
              ghost
              size="large"
              onClick={() => void handleStatusAction('return')}
            >
              ส่งกลับแก้ไข (Return)
            </Button>
          </Col>
          <Col>
            <Button
              type="primary"
              size="large"
              style={{ backgroundColor: COLORS.success, borderColor: COLORS.success }}
              onClick={() => void handleStatusAction('approve')}
            >
              อนุมัติ (Approve)
            </Button>
          </Col>
        </Row>
      )}

      <Modal
        open={createOpen}
        title="สร้าง Change Request"
        okText="บันทึก"
        cancelText="ยกเลิก"
        onCancel={() => {
          setCreateOpen(false);
          form.resetFields();
        }}
        onOk={() => void handleCreate()}
        confirmLoading={createChangeRequest.isPending}
      >
        <Form layout="vertical" form={form}>
          <Form.Item
            label="หัวข้อ"
            name="title"
            rules={[{ required: true, message: 'กรุณาระบุหัวข้อ' }]}
          >
            <Input aria-label="หัวข้อ" />
          </Form.Item>
          <Form.Item
            label="เหตุผล"
            name="reason"
            rules={[{ required: true, message: 'กรุณาระบุเหตุผล' }]}
          >
            <Input.TextArea aria-label="เหตุผล" rows={3} />
          </Form.Item>
          <Form.Item
            label="เชื่อมโยง WBS"
            name="linkedWbs"
            rules={[{ required: true, message: 'กรุณาระบุ WBS' }]}
          >
            <Input aria-label="เชื่อมโยง WBS" />
          </Form.Item>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item
                label="ผลกระทบงบประมาณ"
                name="budgetImpact"
                rules={[{ required: true, message: 'กรุณาระบุผลกระทบงบประมาณ' }]}
              >
                <Input aria-label="ผลกระทบงบประมาณ" type="number" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="ผลกระทบเวลา"
                name="scheduleImpact"
                rules={[{ required: true, message: 'กรุณาระบุผลกระทบเวลา' }]}
              >
                <Input aria-label="ผลกระทบเวลา" type="number" />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item
            label="ระดับความสำคัญ"
            name="priority"
            initialValue="medium"
            rules={[{ required: true, message: 'กรุณาเลือกระดับความสำคัญ' }]}
          >
            <Select
              aria-label="ระดับความสำคัญ"
              options={[
                { value: 'high', label: 'สูง (High)' },
                { value: 'medium', label: 'ปานกลาง (Medium)' },
                { value: 'low', label: 'ต่ำ (Low)' },
              ]}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
