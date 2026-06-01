'use client';

import { Button, Popconfirm, Space } from 'antd';
import {
  DeleteOutlined,
  DownloadOutlined,
  EditOutlined,
  PlusOutlined,
  SaveOutlined,
  UploadOutlined,
} from '@ant-design/icons';

import { COLORS } from '@/theme/antd-theme';

export function WbsActionBar({
  onCreateNode,
  onExportExcel,
  selectedWbsId,
  onEditNode,
  onDeleteNode,
  deletePending,
}: {
  onCreateNode: () => void;
  onExportExcel: () => void;
  /** PR-C2 — when a WBS node is selected, Edit/Delete buttons appear. */
  selectedWbsId?: string;
  onEditNode?: () => void;
  onDeleteNode?: () => void | Promise<void>;
  deletePending?: boolean;
}) {
  const hasSelection = Boolean(selectedWbsId);
  return (
    <div style={{ marginBottom: 16 }}>
      <Space wrap>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={onCreateNode}
          style={{ backgroundColor: COLORS.accentTeal, borderColor: COLORS.accentTeal }}
        >
          เพิ่ม WBS Node
        </Button>
        {hasSelection && onEditNode ? (
          <Button icon={<EditOutlined />} onClick={onEditNode}>
            แก้ไข Node (Edit)
          </Button>
        ) : null}
        {hasSelection && onDeleteNode ? (
          <Popconfirm
            title="ลบ WBS node นี้?"
            description="การลบจะลบโหนดลูกและรายการ BOQ ทั้งหมดในต้นไม้ (Cascade)"
            okText="ลบ"
            cancelText="ยกเลิก"
            okButtonProps={{ danger: true, loading: deletePending }}
            onConfirm={() => void onDeleteNode()}
          >
            <Button danger icon={<DeleteOutlined />} loading={deletePending}>
              ลบ Node (Delete)
            </Button>
          </Popconfirm>
        ) : null}
        <Button icon={<UploadOutlined />}>Import Excel</Button>
        <Button icon={<DownloadOutlined />} onClick={onExportExcel}>Export Excel</Button>
        <Button icon={<SaveOutlined />}>บันทึก Template</Button>
      </Space>
    </div>
  );
}
