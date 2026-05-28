'use client';

import { Badge } from 'antd';
import type { DataNode } from 'antd/es/tree';
import { FolderOpenOutlined, FolderOutlined } from '@ant-design/icons';

import { COLORS } from '@/theme/antd-theme';
import type { Folder, PermissionEntry } from '@/types/document';

export function buildTreeData(folders: Folder[]): DataNode[] {
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

export function WorkflowDots({ workflow }: { workflow: string[] }) {
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

export const PERMISSION_KEYS: { key: keyof Omit<PermissionEntry, 'role'>; label: string }[] = [
  { key: 'upload', label: 'อัปโหลด (Upload)' },
  { key: 'download', label: 'ดาวน์โหลด (Download)' },
  { key: 'edit', label: 'แก้ไข (Edit)' },
  { key: 'delete', label: 'ลบ (Delete)' },
  { key: 'manageFolder', label: 'จัดการโฟลเดอร์ (Manage)' },
];

export interface FolderFormValues {
  name: string;
}

export interface UploadFormValues {
  name: string;
  folderId: string;
  type: string;
  size: string;
}

export interface VersionFormValues {
  note: string;
}
