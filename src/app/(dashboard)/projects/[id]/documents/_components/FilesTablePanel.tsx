'use client';

import { Button, Card, Empty, Popconfirm, Table, Tag, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { DeleteOutlined, FileOutlined } from '@ant-design/icons';

import { formatThaiDate } from '@/lib/date-utils';
import { COLORS } from '@/theme/antd-theme';
import type { DocumentFile, Folder } from '@/types/document';
import { DOC_STATUS_LABELS } from '@/types/document';

import { WorkflowDots } from './helpers';

export function FilesTablePanel({
  selectedFolder,
  selectedFolderId,
  filteredFiles,
  onSelectFile,
  onOpenVersionModal,
  onDeleteFile,
}: {
  selectedFolder: Folder | null;
  selectedFolderId: string;
  filteredFiles: DocumentFile[];
  onSelectFile: (id: string) => void;
  onOpenVersionModal: (file: DocumentFile) => void;
  onDeleteFile: (file: DocumentFile) => Promise<void>;
}) {
  const fileColumns: ColumnsType<DocumentFile> = [
    {
      title: 'ชื่อไฟล์ (Filename)',
      dataIndex: 'name',
      key: 'name',
      ellipsis: true,
      render: (name: string) => (
        <span>
          <FileOutlined style={{ marginRight: 8, color: COLORS.info }} />
          {name}
        </span>
      ),
    },
    {
      title: 'ประเภท (Type)',
      dataIndex: 'type',
      key: 'type',
      width: 130,
    },
    {
      title: 'เวอร์ชัน (Version)',
      dataIndex: 'version',
      key: 'version',
      width: 100,
      align: 'center',
      render: (version: number) => <Tag color="blue">v{version}</Tag>,
    },
    {
      title: 'ขนาด (Size)',
      dataIndex: 'size',
      key: 'size',
      width: 100,
      align: 'right',
    },
    {
      title: 'อัปโหลดโดย (Uploaded By)',
      dataIndex: 'uploadedBy',
      key: 'uploadedBy',
      width: 160,
    },
    {
      title: 'วันที่ (Date)',
      dataIndex: 'uploadedAt',
      key: 'uploadedAt',
      width: 140,
      render: (date: string) => formatThaiDate(date),
    },
    {
      title: 'สถานะ (Status)',
      dataIndex: 'status',
      key: 'status',
      width: 180,
      align: 'center',
      render: (status: DocumentFile['status']) => {
        const entry = DOC_STATUS_LABELS[status];
        return <Tag color={entry.color}>{entry.label}</Tag>;
      },
    },
    {
      title: 'Workflow',
      dataIndex: 'workflow',
      key: 'workflow',
      width: 80,
      align: 'center',
      render: (workflow: string[]) => <WorkflowDots workflow={workflow} />,
    },
    {
      title: 'จัดการ',
      key: 'actions',
      width: 160,
      render: (_: unknown, file: DocumentFile) => (
        <div style={{ display: 'flex', gap: 8 }}>
          <Button
            size="small"
            onClick={() => onOpenVersionModal(file)}
          >
            เวอร์ชันใหม่
          </Button>
          <Popconfirm
            title="ลบเอกสารนี้?"
            okText="ลบ"
            cancelText="ยกเลิก"
            onConfirm={async () => {
              try {
                await onDeleteFile(file);
                message.success(`ลบไฟล์ ${file.name} แล้ว`);
              } catch (error) {
                message.error(error instanceof Error ? error.message : 'ไม่สามารถลบไฟล์ได้');
              }
            }}
          >
            <Button danger size="small" icon={<DeleteOutlined />} />
          </Popconfirm>
        </div>
      ),
    },
  ];

  return (
    <Card
      title={`เอกสาร — ${selectedFolder?.name ?? 'เลือกโฟลเดอร์'}`}
      style={{ borderRadius: 8, boxShadow: '0 2px 10px rgba(0,0,0,0.08)' }}
      styles={{ body: { padding: '16px 24px' } }}
    >
      {selectedFolderId ? (
        <Table<DocumentFile>
          columns={fileColumns}
          dataSource={filteredFiles}
          rowKey="id"
          pagination={false}
          size="middle"
          scroll={{ x: 1200 }}
          onRow={(file) => ({
            onClick: () => onSelectFile(file.id),
          })}
          locale={{ emptyText: <Empty description="ไม่มีเอกสารในโฟลเดอร์นี้" /> }}
        />
      ) : (
        <Empty description="เลือกโฟลเดอร์เพื่อดูเอกสาร" />
      )}
    </Card>
  );
}
