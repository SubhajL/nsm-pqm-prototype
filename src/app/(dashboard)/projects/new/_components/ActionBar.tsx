'use client';

import { Button, Divider, Space } from 'antd';
import { SaveOutlined, SendOutlined } from '@ant-design/icons';

import { COLORS } from '@/theme/antd-theme';

export function ActionBar({
  onCancel,
  onSaveDraft,
  onSubmit,
}: {
  onCancel: () => void;
  onSaveDraft: () => void;
  onSubmit: () => void;
}) {
  return (
    <>
      <Divider />

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <Button onClick={onCancel}>
          ยกเลิก (Cancel)
        </Button>
        <Space>
          <Button icon={<SaveOutlined />} onClick={onSaveDraft}>
            บันทึกร่าง (Save Draft)
          </Button>
          <Button
            type="primary"
            icon={<SendOutlined />}
            onClick={onSubmit}
            style={{
              backgroundColor: COLORS.accentTeal,
              borderColor: COLORS.accentTeal,
            }}
          >
            สร้างโครงการ (Create Project)
          </Button>
        </Space>
      </div>
    </>
  );
}
