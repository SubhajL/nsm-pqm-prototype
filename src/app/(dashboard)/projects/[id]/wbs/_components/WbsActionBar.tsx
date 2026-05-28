'use client';

import { Button, Space } from 'antd';
import {
  DownloadOutlined,
  PlusOutlined,
  SaveOutlined,
  UploadOutlined,
} from '@ant-design/icons';

import { COLORS } from '@/theme/antd-theme';

export function WbsActionBar({
  onCreateNode,
  onExportExcel,
}: {
  onCreateNode: () => void;
  onExportExcel: () => void;
}) {
  return (
    <div style={{ marginBottom: 16 }}>
      <Space wrap>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={onCreateNode}
          style={{
            backgroundColor: COLORS.accentTeal,
            borderColor: COLORS.accentTeal,
          }}
        >
          เพิ่ม WBS Node
        </Button>
        <Button icon={<UploadOutlined />}>Import Excel</Button>
        <Button icon={<DownloadOutlined />} onClick={onExportExcel}>Export Excel</Button>
        <Button icon={<SaveOutlined />}>บันทึก Template</Button>
      </Space>
    </div>
  );
}
