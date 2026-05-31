'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Card,
  Col,
  Form,
  Row,
  Skeleton,
  Typography,
  message,
} from 'antd';

import {
  useCreateDocumentFolder,
  useDeleteDocumentEntry,
  useDocuments,
  useUploadDocument,
  useUploadDocumentVersion,
} from '@/hooks/useDocuments';
import { useRouteProjectId } from '@/hooks/useRouteProjectId';
import type { DocumentFile, Folder } from '@/types/document';

import { DocumentsHeader } from './_components/DocumentsHeader';
import { FilesTablePanel } from './_components/FilesTablePanel';
import { FolderModal } from './_components/FolderModal';
import { FolderTreePanel } from './_components/FolderTreePanel';
import { PermissionsTable } from './_components/PermissionsTable';
import { UploadModal } from './_components/UploadModal';
import { VersionHistoryCard } from './_components/VersionHistoryCard';
import { VersionModal } from './_components/VersionModal';
import {
  buildTreeData,
  type FolderFormValues,
  type UploadFormValues,
  type VersionFormValues,
} from './_components/helpers';

const { Title } = Typography;

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

  const handleOpenUpload = () => {
    uploadForm.setFieldsValue({ folderId: selectedFolderId });
    setUploadModalOpen(true);
  };

  const handleOpenVersionModal = (file: DocumentFile) => {
    setVersionTarget(file);
    versionForm.setFieldsValue({ note: `อัปเดตเอกสาร ${file.name}` });
    setVersionModalOpen(true);
  };

  const handleDeleteFile = async (file: DocumentFile) => {
    await deleteEntry.mutateAsync({ kind: 'file', id: file.id });
  };

  const handleDeleteFolder = async () => {
    if (!selectedFolder) return;
    try {
      await deleteEntry.mutateAsync({ kind: 'folder', id: selectedFolder.id });
      setSelectedFolderId('folder-root');
      message.success(`ลบโฟลเดอร์ ${selectedFolder.name} แล้ว`);
    } catch (error) {
      message.error(error instanceof Error ? error.message : 'ไม่สามารถลบโฟลเดอร์ได้');
    }
  };

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
      <DocumentsHeader
        selectedFolder={selectedFolder}
        onOpenUpload={handleOpenUpload}
        onOpenCreateFolder={() => setFolderModalOpen(true)}
        onDeleteFolder={handleDeleteFolder}
        onSearchChange={setSearchText}
      />

      {/* PR-B1: lg=992-1199 (iPad-landscape range) sized the folder tree at
          ~290px, too narrow for the bilingual labels. Bump the split to
          xl (≥1200) so tablet users get the stacked full-width layout. */}
      <Row gutter={[16, 16]}>
        <Col xs={24} md={24} lg={24} xl={7}>
          <FolderTreePanel
            treeData={treeData}
            selectedFolderId={selectedFolderId}
            onSelect={setSelectedFolderId}
          />
        </Col>

        <Col xs={24} md={24} lg={24} xl={17}>
          <FilesTablePanel
            selectedFolder={selectedFolder}
            selectedFolderId={selectedFolderId}
            filteredFiles={filteredFiles}
            onSelectFile={setSelectedFileId}
            onOpenVersionModal={handleOpenVersionModal}
            onDeleteFile={handleDeleteFile}
          />
        </Col>
      </Row>

      <PermissionsTable permissions={permissions} />

      {selectedFile && selectedFileHistory.length > 0 && (
        <VersionHistoryCard
          selectedFile={selectedFile}
          selectedFileHistory={selectedFileHistory}
        />
      )}

      <FolderModal
        open={folderModalOpen}
        form={folderForm}
        confirmLoading={createFolder.isPending}
        onCancel={() => {
          setFolderModalOpen(false);
          folderForm.resetFields();
        }}
        onOk={() => void handleCreateFolder()}
      />

      <UploadModal
        open={uploadModalOpen}
        form={uploadForm}
        folders={folders}
        confirmLoading={uploadDocument.isPending}
        onCancel={() => {
          setUploadModalOpen(false);
          uploadForm.resetFields();
        }}
        onOk={() => void handleUploadDocument()}
      />

      <VersionModal
        open={versionModalOpen}
        form={versionForm}
        versionTarget={versionTarget}
        confirmLoading={uploadVersion.isPending}
        onCancel={() => {
          setVersionModalOpen(false);
          setVersionTarget(null);
          versionForm.resetFields();
        }}
        onOk={() => void handleUploadVersion()}
      />
    </div>
  );
}
