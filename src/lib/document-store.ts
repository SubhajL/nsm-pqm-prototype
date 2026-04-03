import seedDocuments from '@/data/documents.json';
import { generatedDocumentDataByProject } from '@/lib/generated-project-data';
import type { DocumentData, DocumentFile, Folder, VersionEntry } from '@/types/document';

declare global {
  // eslint-disable-next-line no-var
  var __nsmDocumentStore: Record<string, DocumentData> | undefined;
}

function cloneDocumentData(data: DocumentData): DocumentData {
  return {
    folders: data.folders.map((folder) => ({ ...folder })),
    files: data.files.map((file) => ({ ...file, workflow: [...file.workflow] })),
    versionHistory: Object.fromEntries(
      Object.entries(data.versionHistory).map(([fileId, entries]) => [
        fileId,
        entries.map((entry) => ({ ...entry })),
      ]),
    ),
    permissions: data.permissions.map((permission) => ({ ...permission })),
  };
}

function recalculateFolderCounts(data: DocumentData) {
  const folderChildren = new Map<string | null, Folder[]>();

  data.folders.forEach((folder) => {
    const siblings = folderChildren.get(folder.parentId) ?? [];
    siblings.push(folder);
    folderChildren.set(folder.parentId, siblings);
  });

  const fileCountByFolder = new Map<string, number>();
  const pendingCountByFolder = new Map<string, number>();

  data.files.forEach((file) => {
    fileCountByFolder.set(file.folderId, (fileCountByFolder.get(file.folderId) ?? 0) + 1);
    if (file.status !== 'approved') {
      pendingCountByFolder.set(file.folderId, (pendingCountByFolder.get(file.folderId) ?? 0) + 1);
    }
  });

  const visit = (folderId: string): { files: number; pending: number } => {
    const children = folderChildren.get(folderId) ?? [];
    let files = fileCountByFolder.get(folderId) ?? 0;
    let pending = pendingCountByFolder.get(folderId) ?? 0;

    children.forEach((child) => {
      const childCounts = visit(child.id);
      files += childCounts.files;
      pending += childCounts.pending;
    });

    const folder = data.folders.find((entry) => entry.id === folderId);
    if (folder) {
      folder.fileCount = files;
      folder.pendingCount = pending || undefined;
    }

    return { files, pending };
  };

  data.folders
    .filter((folder) => folder.parentId === null)
    .forEach((folder) => {
      visit(folder.id);
    });
}

export function createEmptyDocumentData(): DocumentData {
  return {
    folders: [],
    files: [],
    versionHistory: {},
    permissions: (seedDocuments as DocumentData).permissions.map((permission) => ({
      ...permission,
    })),
  };
}

export function getDocumentStore() {
  if (!globalThis.__nsmDocumentStore) {
    globalThis.__nsmDocumentStore = {
      'proj-001': cloneDocumentData(seedDocuments as DocumentData),
      ...Object.fromEntries(
        Object.entries(generatedDocumentDataByProject).map(([projectId, data]) => [
          projectId,
          cloneDocumentData(data),
        ]),
      ),
    };
  }

  return globalThis.__nsmDocumentStore;
}

export function getDocumentDataForProject(projectId: string) {
  const store = getDocumentStore();
  if (!store[projectId]) {
    store[projectId] = createEmptyDocumentData();
  }

  return store[projectId];
}

export function addDocumentFolder(
  projectId: string,
  folder: Folder,
) {
  const data = getDocumentDataForProject(projectId);
  data.folders.push(folder);
  recalculateFolderCounts(data);
  return folder;
}

export function addDocumentFile(
  projectId: string,
  file: DocumentFile,
) {
  const data = getDocumentDataForProject(projectId);
  data.files.unshift(file);
  data.versionHistory[file.id] = [
    {
      version: file.version,
      date: file.uploadedAt,
      author: file.uploadedBy,
      note: 'สร้างไฟล์ครั้งแรก',
    },
  ];
  recalculateFolderCounts(data);
  return file;
}

export function uploadDocumentVersion(
  projectId: string,
  fileId: string,
  nextVersion: VersionEntry,
) {
  const data = getDocumentDataForProject(projectId);
  const file = data.files.find((entry) => entry.id === fileId);

  if (!file) {
    return null;
  }

  file.version = nextVersion.version;
  file.uploadedAt = nextVersion.date;
  file.uploadedBy = nextVersion.author;
  file.status = 'draft';
  file.workflow = ['submitted', 'pending', 'pending'];
  data.versionHistory[fileId] = [nextVersion, ...(data.versionHistory[fileId] ?? [])];
  recalculateFolderCounts(data);
  return file;
}

export function deleteDocumentFile(
  projectId: string,
  fileId: string,
) {
  const data = getDocumentDataForProject(projectId);
  const index = data.files.findIndex((file) => file.id === fileId);

  if (index < 0) {
    return null;
  }

  const [removed] = data.files.splice(index, 1);
  delete data.versionHistory[fileId];
  recalculateFolderCounts(data);
  return removed;
}

export function deleteDocumentFolder(
  projectId: string,
  folderId: string,
) {
  const data = getDocumentDataForProject(projectId);

  const folderIdsToDelete = new Set<string>();
  const collect = (currentFolderId: string) => {
    folderIdsToDelete.add(currentFolderId);
    data.folders
      .filter((folder) => folder.parentId === currentFolderId)
      .forEach((child) => collect(child.id));
  };

  collect(folderId);

  const folder = data.folders.find((entry) => entry.id === folderId);
  if (!folder) {
    return null;
  }

  data.folders = data.folders.filter((entry) => !folderIdsToDelete.has(entry.id));
  const deletedFileIds = data.files
    .filter((file) => folderIdsToDelete.has(file.folderId))
    .map((file) => file.id);
  data.files = data.files.filter((file) => !folderIdsToDelete.has(file.folderId));
  deletedFileIds.forEach((fileId) => {
    delete data.versionHistory[fileId];
  });

  recalculateFolderCounts(data);
  return folder;
}
