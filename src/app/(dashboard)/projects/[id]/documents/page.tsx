'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Badge,
  Button,
  Card,
  Col,
  Collapse,
  Empty,
  Form,
  Input,
  Modal,
  Popconfirm,
  Row,
  Select,
  Skeleton,
  Table,
  Tag,
  Timeline,
  Tree,
  Typography,
  message,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { DataNode } from 'antd/es/tree';
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  DeleteOutlined,
  FileOutlined,
  FolderOutlined,
  FolderOpenOutlined,
  PlusOutlined,
  UploadOutlined,
} from '@ant-design/icons';

import {
  useCreateDocumentFolder,
  useDeleteDocumentEntry,
  useDocuments,
  useUploadDocument,
  useUploadDocumentVersion,
} from '@/hooks/useDocuments';
import { useRouteProjectId } from '@/hooks/useRouteProjectId';
import { COLORS } from '@/theme/antd-theme';
import { formatThaiDate } from '@/lib/date-utils';
import type { DocumentFile, Folder, PermissionEntry } from '@/types/document';
import { DOC_STATUS_LABELS } from '@/types/document';

const { Title } = Typography;
const { Search } = Input;

function buildTreeData(folders: Folder[]): DataNode[] {
  const folderMap = new Map<string, DataNode>();

  folders.forEach((folder) => {
    const titleNode = folder.pendingCount ? (
      <Badge
        count={folder.pendingCount}
        size="small"
        offset={[8, 0]}
        color="orange"
      >
        <span>
          {folder.name} ({folder.fileCount ?? 0})
        </span>
      </Badge>
    ) : (
      <span>
        {folder.name} ({folder.fileCount ?? 0})
      </span>
    );

    folderMap.set(folder.id, {
      key: folder.id,
      title: titleNode,
      icon: folder.parentId === null ? <FolderOpenOutlined /> : <FolderOutlined />,
      children: [],
    });
  });

  const roots: DataNode[] = [];

  folders.forEach((folder) => {
    const node = folderMap.get(folder.id);
    if (!node) return;

    if (folder.parentId && folderMap.has(folder.parentId)) {
      const parent = folderMap.get(folder.parentId)!;
      (parent.children as DataNode[]).push(node);
    } else if (!folder.parentId) {
      roots.push(node);
    }
  });

  return roots;
}

function WorkflowDots({ workflow }: { workflow: string[] }) {
  return (
    <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
      {workflow.map((step, index) => {
        let color: string = COLORS.borderLight;
        if (step === 'submitted' || step === 'reviewed' || step === 'approved') {
          color = COLORS.success;
        } else if (step === 'under_review') {
          color = COLORS.warning;
        }

        return (
          <div
            key={`${step}-${index}`}
            style={{
              width: 10,
              height: 10,
              borderRadius: '50%',
              backgroundColor: color,
            }}
          />
        );
      })}
    </div>
  );
}

const PERMISSION_KEYS: { key: keyof Omit<PermissionEntry, 'role'>; label: string }[] = [
  { key: 'upload', label: 'อัปโหลด (Upload)' },
  { key: 'download', label: 'ดาวน์โหลด (Download)' },
  { key: 'edit', label: 'แก้ไข (Edit)' },
  { key: 'delete', label: 'ลบ (Delete)' },
  { key: 'manageFolder', label: 'จัดการโฟลเดอร์ (Manage)' },
];

interface FolderFormValues {
  name: string;
}

interface UploadFormValues {
  name: string;
  folderId: string;
  type: string;
  size: string;
}

interface VersionFormValues {
  note: string;
}

export default function DocumentLibraryPage() {
  const projectId = useRouteProjectId() ?? 'proj-001';
  const { data, isLoading } = useDocuments(projectId);
  const createFolder = useCreateDocumentFolder(projectId);
  const uploadDocument = useUploadDocument(projectId);
  const uploadVersion = useUploadDocumentVersion(projectId);
  const deleteEntry = useDeleteDocumentEntry(projectId);

  const [selectedFolderId, setSelectedFolderId] = useState<string>('');
  const [selectedFileId, setSelectedFileId] = useState<string>('');
  const [searchText, setSearchText] = useState('');
  const [folderModalOpen, setFolderModalOpen] = useState(false);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [versionModalOpen, setVersionModalOpen] = useState(false);
  const [versionTarget, setVersionTarget] = useState<DocumentFile | null>(null);

  const [folderForm] = Form.useForm<FolderFormValues>();
  const [uploadForm] = Form.useForm<UploadFormValues>();
  const [versionForm] = Form.useForm<VersionFormValues>();

  const folders = useMemo(() => data?.folders ?? [], [data]);
  const files = useMemo(() => data?.files ?? [], [data]);
  const versionHistory = data?.versionHistory ?? {};
  const permissions = data?.permissions ?? [];

  const treeData = useMemo(() => buildTreeData(folders), [folders]);

  useEffect(() => {
    if (folders.length === 0) {
      setSelectedFolderId('');
      return;
    }

    setSelectedFolderId((current) => {
      if (current && folders.some((folder) => folder.id === current)) {
        return current;
      }

      const firstChildFolder = folders.find((folder) => folder.parentId !== null);
      return firstChildFolder?.id ?? folders[0]?.id ?? '';
    });
  }, [folders]);

  const selectedFolder = useMemo(
    () => folders.find((folder) => folder.id === selectedFolderId) ?? null,
    [folders, selectedFolderId],
  );

  const filteredFiles = useMemo(() => {
    if (!selectedFolderId) return [];

    let result = files.filter((file) => file.folderId === selectedFolderId);

    if (searchText) {
      const lowerSearch = searchText.toLowerCase();
      result = result.filter(
        (file) =>
          file.name.toLowerCase().includes(lowerSearch) ||
          file.type.toLowerCase().includes(lowerSearch) ||
          file.uploadedBy.toLowerCase().includes(lowerSearch),
      );
    }

    return result;
  }, [files, searchText, selectedFolderId]);

  useEffect(() => {
    if (filteredFiles.length === 0) {
      setSelectedFileId('');
      return;
    }

    setSelectedFileId((current) => {
      if (current && filteredFiles.some((file) => file.id === current)) {
        return current;
      }

      return filteredFiles[0]?.id ?? '';
    });
  }, [filteredFiles]);

  const selectedFile = useMemo(
    () => filteredFiles.find((file) => file.id === selectedFileId) ?? null,
    [filteredFiles, selectedFileId],
  );

  const selectedFileHistory = selectedFile ? versionHistory[selectedFile.id] ?? [] : [];

  type PermissionRow = Record<string, string | boolean>;

  const permissionColumns: ColumnsType<PermissionRow> = [
    {
      title: 'สิทธิ์ (Permission)',
      dataIndex: 'permission',
      key: 'permission',
      width: 200,
      fixed: 'left',
    },
    ...permissions.map((permission) => ({
      title: permission.role,
      dataIndex: permission.role,
      key: permission.role,
      width: 160,
      align: 'center' as const,
      render: (_: unknown, record: PermissionRow) => {
        const value = record[permission.role];
        return value ? (
          <CheckCircleOutlined style={{ color: COLORS.success, fontSize: 18 }} />
        ) : (
          <CloseCircleOutlined style={{ color: COLORS.error, fontSize: 18 }} />
        );
      },
    })),
  ];

  const permissionData: PermissionRow[] = PERMISSION_KEYS.map((permissionKey) => {
    const row: PermissionRow = {
      key: permissionKey.key,
      permission: permissionKey.label,
    };

    permissions.forEach((permission) => {
      row[permission.role] = permission[permissionKey.key];
    });

    return row;
  });

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
            onClick={() => {
              setVersionTarget(file);
              versionForm.setFieldsValue({ note: `อัปเดตเอกสาร ${file.name}` });
              setVersionModalOpen(true);
            }}
          >
            เวอร์ชันใหม่
          </Button>
          <Popconfirm
            title="ลบเอกสารนี้?"
            okText="ลบ"
            cancelText="ยกเลิก"
            onConfirm={async () => {
              try {
                await deleteEntry.mutateAsync({ kind: 'file', id: file.id });
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

  const handleCreateFolder = async () => {
    try {
      const values = await folderForm.validateFields();
      const createdFolder = await createFolder.mutateAsync({
        name: values.name,
        parentId: selectedFolder?.id ?? 'folder-root',
      });
      setFolderModalOpen(false);
      folderForm.resetFields();
      setSelectedFolderId((createdFolder as Folder).id);
      message.success(`สร้างโฟลเดอร์ ${(createdFolder as Folder).name} แล้ว`);
    } catch (error) {
      if (error instanceof Error) {
        message.error(error.message);
      }
    }
  };

  const handleUploadDocument = async () => {
    try {
      const values = await uploadForm.validateFields();
      await uploadDocument.mutateAsync(values);
      setUploadModalOpen(false);
      uploadForm.resetFields();
      setSelectedFolderId(values.folderId);
      message.success(`อัปโหลดเอกสาร ${values.name} แล้ว`);
    } catch (error) {
      if (error instanceof Error) {
        message.error(error.message);
      }
    }
  };

  const handleUploadVersion = async () => {
    if (!versionTarget) return;

    try {
      const values = await versionForm.validateFields();
      await uploadVersion.mutateAsync({
        fileId: versionTarget.id,
        note: values.note,
      });
      setVersionModalOpen(false);
      setVersionTarget(null);
      versionForm.resetFields();
      message.success(`อัปโหลดเวอร์ชันใหม่ให้ ${versionTarget.name} แล้ว`);
    } catch (error) {
      if (error instanceof Error) {
        message.error(error.message);
      }
    }
  };

  if (isLoading) {
    return (
      <div>
        <Title level={3}>คลังเอกสารโครงการ (Document Library)</Title>
        <Card>
          <Skeleton active paragraph={{ rows: 10 }} />
        </Card>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
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
            onClick={() => {
              uploadForm.setFieldsValue({ folderId: selectedFolderId });
              setUploadModalOpen(true);
            }}
          >
            อัปโหลดเอกสาร (Upload)
          </Button>
          <Button
            icon={<PlusOutlined />}
            onClick={() => setFolderModalOpen(true)}
          >
            สร้างโฟลเดอร์
          </Button>
          {selectedFolder && selectedFolder.parentId !== null && (
            <Popconfirm
              title="ลบโฟลเดอร์นี้?"
              okText="ลบ"
              cancelText="ยกเลิก"
              onConfirm={async () => {
                try {
                  await deleteEntry.mutateAsync({ kind: 'folder', id: selectedFolder.id });
                  setSelectedFolderId('folder-root');
                  message.success(`ลบโฟลเดอร์ ${selectedFolder.name} แล้ว`);
                } catch (error) {
                  message.error(error instanceof Error ? error.message : 'ไม่สามารถลบโฟลเดอร์ได้');
                }
              }}
            >
              <Button danger icon={<DeleteOutlined />}>
                ลบโฟลเดอร์
              </Button>
            </Popconfirm>
          )}
          <Search
            placeholder="ค้นหาเอกสาร..."
            allowClear
            onSearch={(value) => setSearchText(value)}
            onChange={(event) => setSearchText(event.target.value)}
            style={{ width: 250 }}
          />
        </div>
      </div>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={7}>
          <Card
            title="โครงสร้างโฟลเดอร์ (Folders)"
            style={{ borderRadius: 8, boxShadow: '0 2px 10px rgba(0,0,0,0.08)' }}
            styles={{ body: { padding: '8px 16px' } }}
          >
            <Tree
              showIcon
              defaultExpandAll
              selectedKeys={[selectedFolderId]}
              onSelect={(keys) => {
                if (keys.length > 0) {
                  setSelectedFolderId(keys[0] as string);
                }
              }}
              treeData={treeData}
            />
          </Card>
        </Col>

        <Col xs={24} lg={17}>
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
                  onClick: () => setSelectedFileId(file.id),
                })}
                locale={{ emptyText: <Empty description="ไม่มีเอกสารในโฟลเดอร์นี้" /> }}
              />
            ) : (
              <Empty description="เลือกโฟลเดอร์เพื่อดูเอกสาร" />
            )}
          </Card>
        </Col>
      </Row>

      <Card
        title="สิทธิ์การเข้าถึงเอกสาร (Document Access Permissions)"
        style={{ borderRadius: 8, boxShadow: '0 2px 10px rgba(0,0,0,0.08)' }}
        styles={{ body: { padding: '16px 24px' } }}
      >
        <Table
          columns={permissionColumns}
          dataSource={permissionData}
          rowKey="key"
          pagination={false}
          size="middle"
          scroll={{ x: 900 }}
        />
      </Card>

      {selectedFile && selectedFileHistory.length > 0 && (
        <Card
          style={{ borderRadius: 8, boxShadow: '0 2px 10px rgba(0,0,0,0.08)' }}
          styles={{ body: { padding: 0 } }}
        >
          <Collapse
            defaultActiveKey={['version-history']}
            ghost
            items={[
              {
                key: 'version-history',
                label: (
                  <span style={{ fontWeight: 600, fontSize: 16 }}>
                    ประวัติเวอร์ชัน — {selectedFile.name}
                  </span>
                ),
                children: (
                  <div style={{ padding: '0 16px 16px' }}>
                    <Timeline
                      items={selectedFileHistory.map((entry, index) => ({
                        color: index === 0 ? COLORS.accentTeal : COLORS.info,
                        children: (
                          <div>
                            <Tag color="blue">v{entry.version}</Tag>
                            <span style={{ fontWeight: 500 }}>{formatThaiDate(entry.date)}</span>
                            <span style={{ margin: '0 8px', color: '#999' }}>|</span>
                            <span>{entry.author}</span>
                            <br />
                            <span style={{ color: '#666' }}>{entry.note}</span>
                          </div>
                        ),
                      }))}
                    />
                  </div>
                ),
              },
            ]}
          />
        </Card>
      )}

      <Modal
        open={folderModalOpen}
        title="สร้างโฟลเดอร์"
        okText="บันทึก"
        cancelText="ยกเลิก"
        onCancel={() => {
          setFolderModalOpen(false);
          folderForm.resetFields();
        }}
        onOk={() => void handleCreateFolder()}
        confirmLoading={createFolder.isPending}
      >
        <Form layout="vertical" form={folderForm}>
          <Form.Item
            label="ชื่อโฟลเดอร์"
            name="name"
            rules={[{ required: true, message: 'กรุณาระบุชื่อโฟลเดอร์' }]}
          >
            <Input />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        open={uploadModalOpen}
        title="อัปโหลดเอกสาร"
        okText="บันทึก"
        cancelText="ยกเลิก"
        onCancel={() => {
          setUploadModalOpen(false);
          uploadForm.resetFields();
        }}
        onOk={() => void handleUploadDocument()}
        confirmLoading={uploadDocument.isPending}
      >
        <Form layout="vertical" form={uploadForm}>
          <Form.Item
            label="ชื่อไฟล์"
            name="name"
            rules={[{ required: true, message: 'กรุณาระบุชื่อไฟล์' }]}
          >
            <Input aria-label="ชื่อไฟล์" />
          </Form.Item>
          <Form.Item
            label="โฟลเดอร์ปลายทาง"
            name="folderId"
            rules={[{ required: true, message: 'กรุณาเลือกโฟลเดอร์' }]}
          >
            <Select
              aria-label="โฟลเดอร์ปลายทาง"
              options={folders
                .filter((folder) => folder.parentId !== null)
                .map((folder) => ({ value: folder.id, label: folder.name }))}
            />
          </Form.Item>
          <Form.Item
            label="ประเภทเอกสาร"
            name="type"
            rules={[{ required: true, message: 'กรุณาระบุประเภทเอกสาร' }]}
          >
            <Input aria-label="ประเภทเอกสาร" />
          </Form.Item>
          <Form.Item
            label="ขนาดไฟล์"
            name="size"
            rules={[{ required: true, message: 'กรุณาระบุขนาดไฟล์' }]}
          >
            <Input aria-label="ขนาดไฟล์" />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        open={versionModalOpen}
        title="อัปโหลดเวอร์ชันใหม่"
        okText="บันทึก"
        cancelText="ยกเลิก"
        onCancel={() => {
          setVersionModalOpen(false);
          setVersionTarget(null);
          versionForm.resetFields();
        }}
        onOk={() => void handleUploadVersion()}
        confirmLoading={uploadVersion.isPending}
      >
        <Form layout="vertical" form={versionForm}>
          <Form.Item label="ไฟล์เป้าหมาย">
            <Input aria-label="ไฟล์เป้าหมาย" value={versionTarget?.name} readOnly />
          </Form.Item>
          <Form.Item
            label="หมายเหตุเวอร์ชัน"
            name="note"
            rules={[{ required: true, message: 'กรุณาระบุหมายเหตุเวอร์ชัน' }]}
          >
            <Input.TextArea aria-label="หมายเหตุเวอร์ชัน" rows={3} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
