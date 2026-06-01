'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Col,
  Form,
  Row,
  Typography,
  message,
} from 'antd';

import { LoadingSkeleton } from '@/components/common';
import {
  useCreateDocumentFolder,
  useDeleteDocumentEntry,
  useDocuments,
  useMoveDocumentFile,
  useRenameDocumentEntry,
  useUploadDocument,
  useUploadDocumentVersion,
} from '@/hooks/useDocuments';
import { useRouteProjectId } from '@/hooks/useRouteProjectId';
import type { DocumentFile, Folder } from '@/types/document';

import { DocumentsHeader } from './_components/DocumentsHeader';
import { FilesTablePanel } from './_components/FilesTablePanel';
import { FolderModal } from './_components/FolderModal';
import { FolderTreePanel } from './_components/FolderTreePanel';
import { MoveDocumentModal, type MoveFormValues } from './_components/MoveDocumentModal';
import { PermissionsTable } from './_components/PermissionsTable';
import { RenameDocumentModal, type RenameFormValues } from './_components/RenameDocumentModal';
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
  const renameEntry = useRenameDocumentEntry(projectId);
  const moveFile = useMoveDocumentFile(projectId);

  const [selectedFolderId, setSelectedFolderId] = useState<string>('');
  const [selectedFileId, setSelectedFileId] = useState<string>('');
  const [searchText, setSearchText] = useState('');
  const [folderModalOpen, setFolderModalOpen] = useState(false);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [versionModalOpen, setVersionModalOpen] = useState(false);
  const [versionTarget, setVersionTarget] = useState<DocumentFile | null>(null);
  const [renameModalOpen, setRenameModalOpen] = useState(false);
  const [renameTarget, setRenameTarget] = useState<
    { kind: 'folder'; folder: Folder } | { kind: 'file'; file: DocumentFile } | null
  >(null);
  const [moveModalOpen, setMoveModalOpen] = useState(false);
  const [moveTarget, setMoveTarget] = useState<DocumentFile | null>(null);

  const [folderForm] = Form.useForm<FolderFormValues>();
  const [uploadForm] = Form.useForm<UploadFormValues>();
  const [versionForm] = Form.useForm<VersionFormValues>();
  const [renameForm] = Form.useForm<RenameFormValues>();
  const [moveForm] = Form.useForm<MoveFormValues>();

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

  const handleOpenRenameFolder = () => {
    if (!selectedFolder) return;
    setRenameTarget({ kind: 'folder', folder: selectedFolder });
    renameForm.setFieldsValue({ name: selectedFolder.name });
    setRenameModalOpen(true);
  };

  const handleOpenRenameFile = (file: DocumentFile) => {
    setRenameTarget({ kind: 'file', file });
    renameForm.setFieldsValue({ name: file.name });
    setRenameModalOpen(true);
  };

  const handleOpenMoveFile = (file: DocumentFile) => {
    setMoveTarget(file);
    moveForm.setFieldsValue({ toFolderId: '' });
    setMoveModalOpen(true);
  };

  const handleRename = async () => {
    if (!renameTarget) return;

    try {
      const values = await renameForm.validateFields();
      if (renameTarget.kind === 'folder') {
        await renameEntry.mutateAsync({
          kind: 'rename_folder',
          id: renameTarget.folder.id,
          name: values.name,
        });
        message.success(`เปลี่ยนชื่อโฟลเดอร์เป็น ${values.name} แล้ว`);
      } else {
        await renameEntry.mutateAsync({
          kind: 'rename_file',
          id: renameTarget.file.id,
          name: values.name,
        });
        message.success(`เปลี่ยนชื่อไฟล์เป็น ${values.name} แล้ว`);
      }
      setRenameModalOpen(false);
      setRenameTarget(null);
      renameForm.resetFields();
    } catch (error) {
      if (error instanceof Error) {
        message.error(error.message);
      }
    }
  };

  const handleMove = async () => {
    if (!moveTarget) return;

    try {
      const values = await moveForm.validateFields();
      await moveFile.mutateAsync({ id: moveTarget.id, toFolderId: values.toFolderId });
      setMoveModalOpen(false);
      setMoveTarget(null);
      moveForm.resetFields();
      const destinationName =
        folders.find((entry) => entry.id === values.toFolderId)?.name ?? values.toFolderId;
      message.success(`ย้าย ${moveTarget.name} ไปยัง ${destinationName} แล้ว`);
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
        <LoadingSkeleton variant="table" rows={10} />
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <DocumentsHeader
        selectedFolder={selectedFolder}
        onOpenUpload={handleOpenUpload}
        onOpenCreateFolder={() => setFolderModalOpen(true)}
        onRenameFolder={handleOpenRenameFolder}
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
            onOpenRenameFile={handleOpenRenameFile}
            onOpenMoveFile={handleOpenMoveFile}
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

      <RenameDocumentModal
        open={renameModalOpen}
        kind={renameTarget?.kind ?? 'folder'}
        form={renameForm}
        confirmLoading={renameEntry.isPending}
        onCancel={() => {
          setRenameModalOpen(false);
          setRenameTarget(null);
          renameForm.resetFields();
        }}
        onOk={() => void handleRename()}
      />

      <MoveDocumentModal
        open={moveModalOpen}
        folders={folders}
        currentFolderId={moveTarget?.folderId}
        form={moveForm}
        confirmLoading={moveFile.isPending}
        onCancel={() => {
          setMoveModalOpen(false);
          setMoveTarget(null);
          moveForm.resetFields();
        }}
        onOk={() => void handleMove()}
      />
    </div>
  );
}
