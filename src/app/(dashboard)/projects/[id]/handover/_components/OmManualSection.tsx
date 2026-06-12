'use client';

import { useState } from 'react';
import { Button, Form, Input, List, Select, Space, Tag, Typography, message } from 'antd';

import { announce } from '@/components/a11y';
import { EmptyState } from '@/components/common';
import { useCreateOmManualEntry } from '@/hooks/useHandover';
import {
  OM_MANUAL_CATEGORIES,
  OM_MANUAL_CATEGORY_LABELS,
  type OmManualCategory,
  type OmManualEntry,
} from '@/types/om-manual';

const { Text } = Typography;

interface OmManualSectionProps {
  packetId: string;
  entries: OmManualEntry[];
  canManage: boolean;
}

interface OmManualFormValues {
  category: OmManualCategory;
  title: string;
}

/** คู่มือ O&M rail — SOP 8.10 requires one entry per category. */
export function OmManualSection({ packetId, entries, canManage }: OmManualSectionProps) {
  const [form] = Form.useForm<OmManualFormValues>();
  const [formOpen, setFormOpen] = useState(false);
  const createEntry = useCreateOmManualEntry(packetId);

  const missingCategories = OM_MANUAL_CATEGORIES.filter(
    (category) => !entries.some((entry) => entry.category === category),
  );

  const handleSubmit = async () => {
    const values = await form.validateFields().catch(() => null);
    if (!values) return;
    try {
      await createEntry.mutateAsync({
        category: values.category,
        title: values.title.trim(),
      });
      message.success('บันทึกคู่มือ O&M แล้ว');
      announce('บันทึกรายการคู่มือ O&M เรียบร้อยแล้ว');
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
    <section aria-label="คู่มือ O&M (O&M manual entries)">
      {entries.length === 0 ? (
        <EmptyState size="small" title="ยังไม่มีคู่มือ O&M (No manual entries yet)" />
      ) : (
        <List
          size="small"
          dataSource={entries}
          renderItem={(entry) => {
            const label = OM_MANUAL_CATEGORY_LABELS[entry.category];
            return (
              <List.Item>
                <Space>
                  <Tag>{`${label.th} (${label.en})`}</Tag>
                  <Text>{entry.title}</Text>
                </Space>
              </List.Item>
            );
          }}
        />
      )}

      {canManage && !formOpen && (
        <Button onClick={() => setFormOpen(true)} style={{ marginTop: 8 }}>
          เพิ่มคู่มือ (Add Manual Entry)
        </Button>
      )}

      {canManage && formOpen && (
        <Form form={form} layout="vertical" style={{ marginTop: 8 }}>
          <Form.Item
            name="category"
            label="หมวด (Category)"
            rules={[{ required: true, message: 'กรุณาเลือกหมวด' }]}
            extra={
              missingCategories.length > 0 ? (
                <Text type="secondary">
                  {`ยังขาด: ${missingCategories
                    .map((category) => OM_MANUAL_CATEGORY_LABELS[category].th)
                    .join(', ')}`}
                </Text>
              ) : null
            }
          >
            <Select
              placeholder="เลือกหมวดคู่มือ"
              options={OM_MANUAL_CATEGORIES.map((category) => ({
                value: category,
                label: `${OM_MANUAL_CATEGORY_LABELS[category].th} (${OM_MANUAL_CATEGORY_LABELS[category].en})`,
              }))}
            />
          </Form.Item>
          <Form.Item
            name="title"
            label="ชื่อเอกสาร (Title)"
            rules={[{ required: true, message: 'กรุณาระบุชื่อเอกสาร' }]}
          >
            <Input placeholder="เช่น คู่มือการใช้งานระบบปรับอากาศ" />
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
            <Button type="primary" loading={createEntry.isPending} onClick={handleSubmit}>
              บันทึก (Save)
            </Button>
          </Space>
        </Form>
      )}
    </section>
  );
}
