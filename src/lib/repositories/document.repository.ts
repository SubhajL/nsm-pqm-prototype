import {
  addDocumentFile,
  addDocumentFolder,
  deleteDocumentFile,
  deleteDocumentFolder,
  getDocumentDataForProject,
  getDocumentStore,
  uploadDocumentVersion,
} from '@/lib/document-store';
import type {
  DocumentData,
  DocumentFile,
  Folder,
  VersionEntry,
} from '@/types/document';

/**
 * Documents are organised per-project (folders + files + version history +
 * permissions) so the surface is built around `projectId` rather than a flat
 * collection. Version sub-operations include `lockVersion`, which is
 * called by document-security workflows (PR-06) and the upload path.
 */
export interface DocumentRepository {
  getDataForProject(projectId: string): Promise<DocumentData>;
  allByProject(): Promise<Record<string, DocumentData>>;

  addFolder(projectId: string, folder: Folder): Promise<Folder>;
  deleteFolder(projectId: string, folderId: string): Promise<Folder | null>;

  addFile(projectId: string, file: DocumentFile): Promise<DocumentFile>;
  deleteFile(projectId: string, fileId: string): Promise<DocumentFile | null>;

  uploadVersion(
    projectId: string,
    fileId: string,
    nextVersion: VersionEntry,
  ): Promise<DocumentFile | null>;

  /**
   * Mark the head version of `fileId` as locked. Returns the patched version
   * entry, or `null` if the file/version is missing. PR-06 calls this after
   * an approved document is signed so subsequent uploads are rejected with
   * `VERSION_LOCKED`.
   */
  lockVersion(projectId: string, fileId: string): Promise<VersionEntry | null>;
}

export class InMemoryDocumentRepository implements DocumentRepository {
  async getDataForProject(projectId: string): Promise<DocumentData> {
    return getDocumentDataForProject(projectId);
  }

  async allByProject(): Promise<Record<string, DocumentData>> {
    return getDocumentStore();
  }

  async addFolder(projectId: string, folder: Folder): Promise<Folder> {
    return addDocumentFolder(projectId, folder);
  }

  async deleteFolder(projectId: string, folderId: string): Promise<Folder | null> {
    return deleteDocumentFolder(projectId, folderId);
  }

  async addFile(projectId: string, file: DocumentFile): Promise<DocumentFile> {
    return addDocumentFile(projectId, file);
  }

  async deleteFile(projectId: string, fileId: string): Promise<DocumentFile | null> {
    return deleteDocumentFile(projectId, fileId);
  }

  async uploadVersion(
    projectId: string,
    fileId: string,
    nextVersion: VersionEntry,
  ): Promise<DocumentFile | null> {
    return uploadDocumentVersion(projectId, fileId, nextVersion);
  }

  async lockVersion(projectId: string, fileId: string): Promise<VersionEntry | null> {
    const data = await this.getDataForProject(projectId);
    const versions = data.versionHistory[fileId];
    if (!versions || versions.length === 0) return null;
    const head = versions[0];
    head.versionLocked = true;
    return head;
  }
}
