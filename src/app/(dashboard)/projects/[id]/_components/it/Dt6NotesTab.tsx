'use client';

import { useState } from 'react';
import { Button, Form, Input, Space, Spin, Tabs, Typography, message } from 'antd';

import { announce } from '@/components/a11y';
import { EmptyState } from '@/components/common';
import {
  useCreateKnowledgeAreaNote,
  useKnowledgeAreaNotes,
} from '@/hooks/useItClass';
import { formatThaiDateShort } from '@/lib/date-utils';
import { COLORS } from '@/theme/antd-theme';
import {
  DT6_AREAS,
  DT6_AREA_LABELS,
  type Dt6Area,
} from '@/types/knowledge-area-note';

import { latestNote } from './it-class-actions';

const { Text, Paragraph } = Typography;

interface Dt6NotesTabProps {
  projectId: string;
  canManage: boolean;
}

function AreaPanel({
  projectId,
  area,
  canManage,
}: {
  projectId: string;
  area: Dt6Area;
  canManage: boolean;
}) {
  const [form] = Form.useForm<{ content: string }>();
  const [editorOpen, setEditorOpen] = useState(false);
  const { data, isLoading } = useKnowledgeAreaNotes(projectId, area);
  const createNote = useCreateKnowledgeAreaNote(projectId);

  const latest = latestNote(data);

  const handleSubmit = async () => {
    const values = await form.validateFields().catch(() => null);
    if (!values) return;
    try {
      const created = await createNote.mutateAsync({
        area,
        content: values.content.trim(),
      });
      message.success(`บันทึก DT6 เวอร์ชัน ${created.version} แล้ว`);
      announce(`บันทึก DT6 เวอร์ชัน ${created.version} เรียบร้อยแล้ว`);
      form.resetFields();
      setEditorOpen(false);
    } catch (error) {
      if (error instanceof Error) {
        message.error(error.message);
        announce(`เกิดข้อผิดพลาด: ${error.message}`, 'assertive');
      }
    }
  };

  if (isLoading) return <Spin />;

  return (
    <Space direction="vertical" size="middle" style={{ width: '100%' }}>
      {latest ? (
        <div>
          <Text type="secondary" style={{ fontSize: 12 }}>
            เวอร์ชัน (Version) {latest.version} ·{' '}
            {formatThaiDateShort(latest.authoredAt)} · โดย (by) {latest.authoredBy}
          </Text>
          <Paragraph
            style={{
              whiteSpace: 'pre-wrap',
              marginTop: 12,
              padding: 16,
              background: COLORS.bgLayout,
              borderRadius: 8,
            }}
          >
            {latest.content}
          </Paragraph>
        </div>
      ) : (
        <EmptyState size="small" title="ยังไม่มีบันทึก (No note yet)" />
      )}

      {canManage && !editorOpen && (
        <Button onClick={() => setEditorOpen(true)}>
          {latest
            ? `เพิ่มเวอร์ชัน ${latest.version + 1} (New Version)`
            : 'เขียนบันทึกแรก (Write First Note)'}
        </Button>
      )}

      {canManage && editorOpen && (
        <Form form={form} layout="vertical">
          <Form.Item
            name="content"
            label="เนื้อหา (Content)"
            rules={[{ required: true, message: 'กรุณาระบุเนื้อหา' }]}
          >
            <Input.TextArea
              rows={6}
              placeholder="บันทึกตามแนวทาง DT6 สำหรับหัวข้อนี้"
            />
          </Form.Item>
          <Space>
            <Button
              onClick={() => {
                form.resetFields();
                setEditorOpen(false);
              }}
            >
              ยกเลิก (Cancel)
            </Button>
            <Button type="primary" loading={createNote.isPending} onClick={handleSubmit}>
              บันทึก (Save)
            </Button>
          </Space>
        </Form>
      )}
    </Space>
  );
}

/** DT6 per-area versioned notes (append-only; server assigns versions). */
export function Dt6NotesTab({ projectId, canManage }: Dt6NotesTabProps) {
  const [activeArea, setActiveArea] = useState<Dt6Area>(DT6_AREAS[0]);

  return (
    <Tabs
      activeKey={activeArea}
      onChange={(key) => setActiveArea(key as Dt6Area)}
      items={DT6_AREAS.map((area) => ({
        key: area,
        label: `${DT6_AREA_LABELS[area].th} (${DT6_AREA_LABELS[area].en})`,
        children: <AreaPanel projectId={projectId} area={area} canManage={canManage} />,
      }))}
    />
  );
}
