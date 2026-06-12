'use client';

import { useState } from 'react';
import {
  Button,
  Form,
  Input,
  InputNumber,
  Modal,
  Select,
  Space,
  Spin,
  Table,
  Tag,
  message,
} from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';

import { announce } from '@/components/a11y';
import { EmptyState } from '@/components/common';
import { useCreateLandAcquisition, useLandAcquisition } from '@/hooks/useCompliance';
import { formatBaht } from '@/lib/date-utils';
import {
  LAND_ACQ_STATUSES,
  LAND_ACQ_STATUS_LABELS,
  type LandAcquisitionRecord,
  type LandAcquisitionStatus,
} from '@/types/land-acquisition';

import { statusCountEntries } from './permits-actions';

interface LandTabProps {
  projectId: string;
  canManage: boolean;
}

interface LandFormValues {
  parcelReference: string;
  landownerName: string;
  areaRai: number;
  status: LandAcquisitionStatus;
  compensationAmount?: number | null;
}

/** การจัดหาที่ดิน register — one row per parcel. */
export function LandTab({ projectId, canManage }: LandTabProps) {
  const [form] = Form.useForm<LandFormValues>();
  const [createOpen, setCreateOpen] = useState(false);
  const { data: records, isLoading } = useLandAcquisition(projectId);
  const createRecord = useCreateLandAcquisition(projectId);

  if (isLoading) return <Spin />;

  const list = records ?? [];
  const counts = statusCountEntries(list, (r) => r.status, LAND_ACQ_STATUS_LABELS);

  const close = () => {
    form.resetFields();
    setCreateOpen(false);
  };

  const handleOk = async () => {
    let values: LandFormValues;
    try {
      values = await form.validateFields();
    } catch {
      return; // antd shows the field-level errors
    }

    try {
      await createRecord.mutateAsync({
        parcelReference: values.parcelReference.trim(),
        landownerName: values.landownerName.trim(),
        areaRai: values.areaRai,
        status: values.status,
        compensationAmount: values.compensationAmount ?? null,
      });
      message.success('เพิ่มแปลงที่ดินแล้ว');
      announce('เพิ่มข้อมูลแปลงที่ดินเรียบร้อยแล้ว');
      close();
    } catch (error) {
      if (error instanceof Error) {
        message.error(error.message);
        announce(`เกิดข้อผิดพลาด: ${error.message}`, 'assertive');
      }
    }
  };

  const columns: ColumnsType<LandAcquisitionRecord> = [
    { title: 'แปลงที่ดิน (Parcel)', dataIndex: 'parcelReference', key: 'parcelReference' },
    { title: 'เจ้าของ (Owner)', dataIndex: 'landownerName', key: 'landownerName' },
    {
      title: 'เนื้อที่ (ไร่ / Rai)',
      dataIndex: 'areaRai',
      key: 'areaRai',
      align: 'right',
    },
    {
      title: 'สถานะ (Status)',
      dataIndex: 'status',
      key: 'status',
      render: (status: LandAcquisitionRecord['status']) => {
        const label = LAND_ACQ_STATUS_LABELS[status];
        return <Tag color={label.color}>{`${label.th} (${label.en})`}</Tag>;
      },
    },
    {
      title: 'ค่าชดเชย (Compensation)',
      dataIndex: 'compensationAmount',
      key: 'compensationAmount',
      align: 'right',
      render: (amount: number | null) => (amount === null ? '—' : formatBaht(amount)),
    },
  ];

  return (
    <Space direction="vertical" size="middle" style={{ width: '100%' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 16,
          flexWrap: 'wrap',
        }}
      >
        <Space wrap>
          {counts.map((entry) => (
            <Tag key={entry.key} color={entry.color}>
              {`${entry.count} ${entry.label}`}
            </Tag>
          ))}
        </Space>
        {canManage && (
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateOpen(true)}>
            เพิ่มแปลงที่ดิน (Add Parcel)
          </Button>
        )}
      </div>

      {list.length === 0 ? (
        <EmptyState
          size="small"
          title="ยังไม่มีข้อมูลที่ดิน (No parcels yet)"
          description="บันทึกแปลงที่ดินที่ต้องจัดหาเพื่อใช้ก่อสร้าง"
        />
      ) : (
        <Table rowKey="id" size="middle" columns={columns} dataSource={list} pagination={false} />
      )}

      <Modal
        title="เพิ่มแปลงที่ดิน (Add Land Parcel)"
        open={createOpen}
        onOk={handleOk}
        onCancel={close}
        confirmLoading={createRecord.isPending}
        okText="บันทึก (Save)"
        cancelText="ยกเลิก (Cancel)"
      >
        <Form form={form} layout="vertical" requiredMark style={{ marginTop: 12 }}>
          <Form.Item
            name="parcelReference"
            label="แปลงที่ดิน (Parcel Reference)"
            rules={[{ required: true, message: 'กรุณาระบุแปลงที่ดิน' }]}
          >
            <Input placeholder="เช่น โฉนดเลขที่ 12345 ต.ลำชี อ.เมือง" />
          </Form.Item>
          <Form.Item
            name="landownerName"
            label="เจ้าของที่ดิน (Landowner)"
            rules={[{ required: true, message: 'กรุณาระบุชื่อเจ้าของ' }]}
          >
            <Input placeholder="ชื่อ-สกุล เจ้าของที่ดิน" />
          </Form.Item>
          <Form.Item
            name="areaRai"
            label="เนื้อที่ (Area, ไร่)"
            rules={[{ required: true, message: 'กรุณาระบุเนื้อที่' }]}
          >
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item
            name="status"
            label="สถานะ (Status)"
            initialValue="identified"
            rules={[{ required: true, message: 'กรุณาเลือกสถานะ' }]}
          >
            <Select
              options={LAND_ACQ_STATUSES.map((status) => ({
                value: status,
                label: `${LAND_ACQ_STATUS_LABELS[status].th} (${LAND_ACQ_STATUS_LABELS[status].en})`,
              }))}
            />
          </Form.Item>
          <Form.Item name="compensationAmount" label="ค่าชดเชย (Compensation, บาท)">
            <InputNumber<number>
              min={0}
              style={{ width: '100%' }}
              formatter={(value) =>
                value === undefined || value === null
                  ? ''
                  : `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
              }
              // Empty input must stay "no figure yet" (null), NOT ฿0 — the
              // register treats null as "compensation not negotiated".
              parser={(value) => {
                const cleaned = (value ?? '').replace(/,/g, '').trim();
                return cleaned === ''
                  ? (null as unknown as number)
                  : Number(cleaned);
              }}
            />
          </Form.Item>
        </Form>
      </Modal>
    </Space>
  );
}
