'use client';

import { Button, Input, Popconfirm, Typography } from 'antd';
import {
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
  UploadOutlined,
} from '@ant-design/icons';

import { COLORS } from '@/theme/antd-theme';
import type { Folder } from '@/types/document';

const { Title } = Typography;
const { Search } = Input;

export function DocumentsHeader({
  selectedFolder,
  onOpenUpload,
  onOpenCreateFolder,
  onRenameFolder,
  onDeleteFolder,
  onSearchChange,
}: {
  selectedFolder: Folder | null;
  onOpenUpload: () => void;
  onOpenCreateFolder: () => void;
  onRenameFolder: () => void;
  onDeleteFolder: () => Promise<void>;
  onSearchChange: (value: string) => void;
}) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 12,
      }}
    >
      <Title level={3} style={{ margin: 0 }}>
        คลังเอกสารโครงการ (Document Library)
      </Title>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <Button
          type="primary"
          icon={<UploadOutlined />}
          style={{ backgroundColor: COLORS.accentTeal, borderColor: COLORS.accentTeal }}
          onClick={onOpenUpload}
        >
          อัปโหลดเอกสาร (Upload)
        </Button>
        <Button
          icon={<PlusOutlined />}
          onClick={onOpenCreateFolder}
        >
          สร้างโฟลเดอร์
        </Button>
        {selectedFolder && selectedFolder.parentId !== null && (
          <Button
            icon={<EditOutlined />}
            onClick={onRenameFolder}
            aria-label="เปลี่ยนชื่อโฟลเดอร์ (Rename folder)"
          >
            เปลี่ยนชื่อโฟลเดอร์ (Rename)
          </Button>
        )}
        {selectedFolder && selectedFolder.parentId !== null && (
          <Popconfirm
            title="ลบโฟลเดอร์นี้?"
            okText="ลบ"
            cancelText="ยกเลิก"
            onConfirm={() => void onDeleteFolder()}
          >
            <Button danger icon={<DeleteOutlined />}>
              ลบโฟลเดอร์
            </Button>
          </Popconfirm>
        )}
        <Search
          placeholder="ค้นหาเอกสาร..."
          allowClear
          onSearch={(value) => onSearchChange(value)}
          onChange={(event) => onSearchChange(event.target.value)}
          style={{ width: 250 }}
        />
      </div>
    </div>
  );
}
