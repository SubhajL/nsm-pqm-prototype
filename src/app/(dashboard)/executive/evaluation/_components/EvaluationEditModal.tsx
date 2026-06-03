'use client';

import { useState } from 'react';
import { Divider, Form, Input, Modal, Rate, Space, Typography, message } from 'antd';

import { announce } from '@/components/a11y';
import { useUpsertEvaluation } from '@/hooks/useEvaluation';
import {
  DEFAULT_EVALUATION_CATEGORIES,
  type EvaluationCategory,
  type ProjectEvaluation,
} from '@/types/evaluation';

const { Text } = Typography;

interface EvaluationEditModalProps {
  projectId: string;
  /** Mounted only while editing, so local state initialises per open. */
  onClose: () => void;
  initial?: ProjectEvaluation;
}

interface EvaluationFormValues {
  evaluatedBy: string;
  recommendation: string;
}

function isoToday(): string {
  return new Date().toISOString().slice(0, 10);
}

export function EvaluationEditModal({
  projectId,
  onClose,
  initial,
}: EvaluationEditModalProps) {
  const [form] = Form.useForm<EvaluationFormValues>();
  const [categories, setCategories] = useState<EvaluationCategory[]>(() =>
    (initial?.categories ?? DEFAULT_EVALUATION_CATEGORIES).map((c) => ({ ...c })),
  );
  const upsert = useUpsertEvaluation(projectId);

  const setScore = (index: number, score: number) => {
    setCategories((prev) =>
      prev.map((c, i) => (i === index ? { ...c, score } : c)),
    );
  };
  const setNote = (index: number, note: string) => {
    setCategories((prev) =>
      prev.map((c, i) => (i === index ? { ...c, note } : c)),
    );
  };

  const handleOk = async () => {
    let values: EvaluationFormValues;
    try {
      values = await form.validateFields();
    } catch {
      return;
    }

    try {
      await upsert.mutateAsync({
        evaluatedBy: values.evaluatedBy.trim(),
        evaluatedAt: initial?.evaluatedAt ?? isoToday(),
        categories: categories.map((c) => ({
          name: c.name,
          nameEn: c.nameEn,
          score: c.score,
          note: c.note,
        })),
        recommendation: values.recommendation ?? '',
      });
      message.success('บันทึกผลการประเมินแล้ว');
      announce('บันทึกผลการประเมินโครงการเรียบร้อยแล้ว');
      onClose();
    } catch (error) {
      if (error instanceof Error) {
        message.error(error.message);
        announce(`เกิดข้อผิดพลาด: ${error.message}`, 'assertive');
      }
    }
  };

  return (
    <Modal
      title="แก้ไขผลการประเมิน (Edit Evaluation)"
      open
      onOk={handleOk}
      onCancel={onClose}
      confirmLoading={upsert.isPending}
      okText="บันทึก (Save)"
      cancelText="ยกเลิก (Cancel)"
      width={620}
    >
      <Form
        form={form}
        layout="vertical"
        style={{ marginTop: 12 }}
        initialValues={{
          evaluatedBy: initial?.evaluatedBy ?? '',
          recommendation: initial?.recommendation ?? '',
        }}
      >
        <Form.Item
          name="evaluatedBy"
          label="ผู้ประเมิน (Evaluated By)"
          rules={[{ required: true, message: 'กรุณาระบุผู้ประเมิน' }]}
        >
          <Input />
        </Form.Item>

        <Divider style={{ margin: '8px 0' }}>คะแนนรายหมวด (Category Scores)</Divider>

        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          {categories.map((cat, index) => (
            <div key={`${cat.nameEn}-${index}`}>
              <div style={{ marginBottom: 4 }}>
                <Text strong>{cat.name}</Text>{' '}
                <Text type="secondary" style={{ fontSize: 12 }}>
                  ({cat.nameEn})
                </Text>
              </div>
              <Space wrap>
                <Rate
                  allowClear={false}
                  value={cat.score}
                  onChange={(v) => setScore(index, v)}
                  aria-label={`คะแนน ${cat.name}`}
                />
                <Input
                  value={cat.note}
                  onChange={(e) => setNote(index, e.target.value)}
                  placeholder="หมายเหตุ (Note)"
                  style={{ width: 280 }}
                  aria-label={`หมายเหตุ ${cat.name}`}
                />
              </Space>
            </div>
          ))}
        </Space>

        <Divider style={{ margin: '16px 0 8px' }} />

        <Form.Item name="recommendation" label="ข้อเสนอแนะ (Recommendation)">
          <Input.TextArea rows={2} />
        </Form.Item>
      </Form>
    </Modal>
  );
}
