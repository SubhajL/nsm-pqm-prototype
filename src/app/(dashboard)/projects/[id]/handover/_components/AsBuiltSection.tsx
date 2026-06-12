'use client';

import { useState } from 'react';
import { Button, Form, Input, List, Space, Typography, message } from 'antd';

import { announce } from '@/components/a11y';
import { EmptyState } from '@/components/common';
import { useCreateAsBuiltDrawing } from '@/hooks/useHandover';
import { formatThaiDateShort } from '@/lib/date-utils';
import type { AsBuiltDrawing } from '@/types/as-built-drawing';

const { Text } = Typography;

interface AsBuiltSectionProps {
  packetId: string;
  drawings: AsBuiltDrawing[];
  canManage: boolean;
}

interface AsBuiltFormValues {
  drawingNumber: string;
  title: string;
  revision: string;
}

/** แบบก่อสร้างจริง register rail — first item of the SOP 8.1 gate. */
export function AsBuiltSection({ packetId, drawings, canManage }: AsBuiltSectionProps) {
  const [form] = Form.useForm<AsBuiltFormValues>();
  const [formOpen, setFormOpen] = useState(false);
  const createDrawing = useCreateAsBuiltDrawing(packetId);

  const handleSubmit = async () => {
    const values = await form.validateFields().catch(() => null);
    if (!values) return;
    try {
      await createDrawing.mutateAsync({
        drawingNumber: values.drawingNumber.trim(),
        title: values.title.trim(),
        revision: values.revision.trim(),
      });
      message.success('บันทึกแบบก่อสร้างจริงแล้ว');
      announce('บันทึกแบบก่อสร้างจริงเรียบร้อยแล้ว');
      form.resetFields();
      setFormOpen(false);
    } catch (error) {
      if (error instanceof Error) {
        message.error(error.message);
        announce(`เกิดข้อผิดพลาด: ${error.message}`, 'assertive');
      }
    }
  };

  return (
    <section aria-label="แบบก่อสร้างจริง (As-built drawings)">
      {drawings.length === 0 ? (
        <EmptyState size="small" title="ยังไม่มีแบบก่อสร้างจริง (No as-built drawings yet)" />
      ) : (
        <List
          size="small"
          dataSource={drawings}
          renderItem={(drawing) => (
            <List.Item>
              <Space direction="vertical" size={0}>
                <Text strong>{`${drawing.drawingNumber} · ${drawing.revision}`}</Text>
                <Text type="secondary">
                  {`${drawing.title} · ${formatThaiDateShort(drawing.uploadedAt)}`}
                </Text>
              </Space>
            </List.Item>
          )}
        />
      )}

      {canManage && !formOpen && (
        <Button onClick={() => setFormOpen(true)} style={{ marginTop: 8 }}>
          ลงทะเบียนแบบ (Register Drawing)
        </Button>
      )}

      {canManage && formOpen && (
        <Form form={form} layout="vertical" style={{ marginTop: 8 }}>
          <Form.Item
            name="drawingNumber"
            label="เลขที่แบบ (Drawing No.)"
            rules={[{ required: true, message: 'กรุณาระบุเลขที่แบบ' }]}
          >
            <Input placeholder="เช่น AB-CONST-001" />
          </Form.Item>
          <Form.Item
            name="title"
            label="ชื่อแบบ (Title)"
            rules={[{ required: true, message: 'กรุณาระบุชื่อแบบ' }]}
          >
            <Input placeholder="เช่น แปลนอาคารนิทรรศการ ชั้น 1" />
          </Form.Item>
          <Form.Item
            name="revision"
            label="ฉบับแก้ไข (Revision)"
            rules={[{ required: true, message: 'กรุณาระบุฉบับแก้ไข' }]}
          >
            <Input placeholder="เช่น Rev A" />
          </Form.Item>
          <Space>
            <Button
              onClick={() => {
                form.resetFields();
                setFormOpen(false);
              }}
            >
              ยกเลิก (Cancel)
            </Button>
            <Button type="primary" loading={createDrawing.isPending} onClick={handleSubmit}>
              บันทึก (Save)
            </Button>
          </Space>
        </Form>
      )}
    </section>
  );
}
