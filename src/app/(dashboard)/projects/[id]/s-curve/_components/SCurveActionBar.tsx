'use client';

import { Button, Space } from 'antd';
import {
  FileExcelOutlined,
  FilePdfOutlined,
  UnorderedListOutlined,
} from '@ant-design/icons';

export function SCurveActionBar({
  onExportPdf,
  onExportExcel,
}: {
  onExportPdf: () => void;
  onExportExcel: () => void;
}) {
  return (
    <Space size={12}>
      <Button icon={<FilePdfOutlined />} onClick={onExportPdf}>Export PDF</Button>
      <Button icon={<FileExcelOutlined />} onClick={onExportExcel}>Export Excel</Button>
      <Button
        type="primary"
        ghost
        icon={<UnorderedListOutlined />}
      >
        Drill-down ตามงวดงาน
      </Button>
    </Space>
  );
}
