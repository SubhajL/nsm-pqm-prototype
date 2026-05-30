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
 *
 * PR-21b: added `updateFileMetadata` for routes that need to patch the
 * jsonb-overlay fields (sha256, sizeBytes, mimeType, virus-scan state)
 * after an upload — replaces the previous in-place `updatedFile.sha256 = …`
 * mutation pattern.
 */
export interface DocumentRepository {
  getDataForProject(projectId: string): Promise<DocumentData>;
  allByProject(): Promise<Record<string, DocumentData>>;

  addFolder(projectId: string, folder: Folder): Promise<Folder>;
  deleteFolder(projectId: string, folderId: string): Promise<Folder | null>;

  addFile(projectId: string, file: DocumentFile): Promise<DocumentFile>;
  /**
   * Patches mutable metadata on a file row (sha256, sizeBytes, mimeType,
   * virusScanStatus, virusScanCheckedAt, status, workflow, retentionPolicy,
   * accessPolicy). Returns the updated row or null if the file is missing.
   */
  updateFileMetadata(
    projectId: string,
    fileId: string,
    patch: Partial<DocumentFile>,
  ): Promise<DocumentFile | null>;
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
