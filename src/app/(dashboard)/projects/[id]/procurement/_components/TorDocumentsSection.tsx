'use client';

import { useState } from 'react';
import { Button, Form, Input, List, Space, Tag, Typography, message } from 'antd';

import { announce } from '@/components/a11y';
import { EmptyState } from '@/components/common';
import { useCreateTorDocument, useTorDocuments } from '@/hooks/useProcurement';
import { formatThaiDateShort } from '@/lib/date-utils';

const { Text } = Typography;

interface TorDocumentsSectionProps {
  packageId: string;
  canManage: boolean;
}

interface TorFormValues {
  scopeSummary: string;
  technicalRequirements: string;
  deliverySchedule: string;
  evaluationCriteria: string;
}

/** TOR revision rail — one row per version, newest version first. */
export function TorDocumentsSection({ packageId, canManage }: TorDocumentsSectionProps) {
  const [form] = Form.useForm<TorFormValues>();
  const [formOpen, setFormOpen] = useState(false);
  const { data: tors } = useTorDocuments(packageId);
  const createTor = useCreateTorDocument(packageId);

  const list = [...(tors ?? [])].sort((a, b) => b.version - a.version);
  const nextVersion = list.length === 0 ? 1 : list[0].version + 1;

  const handleSubmit = async () => {
    const values = await form.validateFields().catch(() => null);
    if (!values) return;
    try {
      await createTor.mutateAsync({
        version: nextVersion,
        scopeSummary: values.scopeSummary.trim(),
        technicalRequirements: values.technicalRequirements.trim(),
        deliverySchedule: values.deliverySchedule.trim(),
        evaluationCriteria: values.evaluationCriteria.trim(),
      });
      message.success(`บันทึก TOR ฉบับที่ ${nextVersion} แล้ว`);
      announce(`บันทึกเอกสาร TOR ฉบับที่ ${nextVersion} เรียบร้อยแล้ว`);
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
    <section aria-label="เอกสาร TOR (TOR revisions)">
      {list.length === 0 ? (
        <EmptyState size="small" title="ยังไม่มีเอกสาร TOR (No TOR revisions yet)" />
      ) : (
        <List
          size="small"
          dataSource={list}
          renderItem={(tor) => (
            <List.Item>
              <Space direction="vertical" size={0} style={{ width: '100%' }}>
                <Space>
                  <Text strong>{`ฉบับที่ ${tor.version} (v${tor.version})`}</Text>
                  {tor.approvedAt ? (
                    <Tag color="success">{`อนุมัติ ${formatThaiDateShort(tor.approvedAt)}`}</Tag>
                  ) : (
                    <Tag>ร่าง (Draft)</Tag>
                  )}
                </Space>
                <Text type="secondary">{tor.scopeSummary}</Text>
              </Space>
            </List.Item>
          )}
        />
      )}

      {canManage && !formOpen && (
        <Button onClick={() => setFormOpen(true)} style={{ marginTop: 8 }}>
          {`ยื่น TOR ฉบับที่ ${nextVersion} (File TOR v${nextVersion})`}
        </Button>
      )}

      {canManage && formOpen && (
        <Form form={form} layout="vertical" style={{ marginTop: 8 }}>
          <Form.Item
            name="scopeSummary"
            label="ขอบเขตงาน (Scope)"
            rules={[{ required: true, message: 'กรุณาระบุขอบเขตงาน' }]}
          >
            <Input.TextArea rows={2} placeholder="สรุปขอบเขตงานที่จัดหา" />
          </Form.Item>
          <Form.Item
            name="technicalRequirements"
            label="ข้อกำหนดทางเทคนิค (Technical Requirements)"
            rules={[{ required: true, message: 'กรุณาระบุข้อกำหนดทางเทคนิค' }]}
          >
            <Input.TextArea rows={2} placeholder="ข้อกำหนดทางเทคนิคหลัก" />
          </Form.Item>
          <Form.Item
            name="deliverySchedule"
            label="กำหนดการส่งมอบ (Delivery Schedule)"
            rules={[{ required: true, message: 'กรุณาระบุกำหนดการส่งมอบ' }]}
          >
            <Input.TextArea rows={2} placeholder="งวดการส่งมอบโดยสรุป" />
          </Form.Item>
          <Form.Item
            name="evaluationCriteria"
            label="เกณฑ์การพิจารณา (Evaluation Criteria)"
            rules={[{ required: true, message: 'กรุณาระบุเกณฑ์การพิจารณา' }]}
          >
            <Input.TextArea rows={2} placeholder="เกณฑ์คะแนน/ราคา" />
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
            <Button type="primary" loading={createTor.isPending} onClick={handleSubmit}>
              บันทึก (Save)
            </Button>
          </Space>
        </Form>
      )}
    </section>
  );
}
