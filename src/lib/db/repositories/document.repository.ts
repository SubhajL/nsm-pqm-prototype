import { and, desc, eq } from 'drizzle-orm';

import type { Db } from '@/lib/db/client';
import {
  documentFiles,
  documentFolders,
  documentPermissions,
  documentVersions,
} from '@/lib/db/schema';
import type { DocumentRepository } from '@/lib/repositories/document.repository';
import type {
  DocStatus,
  DocumentAccessPolicy,
  DocumentData,
  DocumentFile,
  DocumentRetentionPolicy,
  Folder,
  PermissionEntry,
  VersionEntry,
  VirusScanStatus,
} from '@/types/document';

/**
 * Drizzle-backed `DocumentRepository` — folders, files, versions and per-role
 * permissions live in four tables. `getDataForProject` re-assembles the
 * original `DocumentData` blob shape so callers don't see a behaviour change
 * vs the InMemory impl.
 */
export class DatabaseDocumentRepository implements DocumentRepository {
  constructor(private readonly db: Db) {}

  async getDataForProject(projectId: string): Promise<DocumentData> {
    const [folders, files, versions, permissions] = await Promise.all([
      this.db.select().from(documentFolders).where(eq(documentFolders.projectId, projectId)),
      this.db.select().from(documentFiles).where(eq(documentFiles.projectId, projectId)),
      this.db
        .select()
        .from(documentVersions)
        .where(eq(documentVersions.projectId, projectId))
        .orderBy(desc(documentVersions.version)),
      this.db
        .select()
        .from(documentPermissions)
        .where(eq(documentPermissions.projectId, projectId)),
    ]);

    const versionHistory: Record<string, VersionEntry[]> = {};
    for (const v of versions) {
      const entry: VersionEntry = {
        version: v.version,
        date: v.date,
        author: v.author,
        note: v.note,
        versionLocked: v.versionLocked,
        sha256: v.sha256 ?? undefined,
      };
      const bucket = versionHistory[v.fileId];
      if (bucket) {
        bucket.push(entry);
      } else {
        versionHistory[v.fileId] = [entry];
      }
    }

    return {
      folders: folders.map(rowToFolder),
      files: files.map(rowToFile),
      versionHistory,
      permissions: permissions.map(rowToPermission),
    };
  }

  async allByProject(): Promise<Record<string, DocumentData>> {
    const rows = await this.db.select({ projectId: documentFolders.projectId }).from(documentFolders);
    const projectIds = Array.from(new Set(rows.map((row) => row.projectId)));
    const result: Record<string, DocumentData> = {};
    for (const id of projectIds) {
      result[id] = await this.getDataForProject(id);
    }
    return result;
  }

  async addFolder(projectId: string, folder: Folder): Promise<Folder> {
    const [row] = await this.db
      .insert(documentFolders)
      .values(folderToRow(projectId, folder))
      .returning();
    return rowToFolder(row);
  }

  async deleteFolder(projectId: string, folderId: string): Promise<Folder | null> {
    const [row] = await this.db
      .delete(documentFolders)
      .where(and(eq(documentFolders.projectId, projectId), eq(documentFolders.id, folderId)))
      .returning();
    if (!row) return null;

    // Cascade: remove all files in that folder (and their versions).
    const fileRows = await this.db
      .select({ id: documentFiles.id })
      .from(documentFiles)
      .where(and(eq(documentFiles.projectId, projectId), eq(documentFiles.folderId, folderId)));

    for (const file of fileRows) {
      await this.db
        .delete(documentVersions)
        .where(
          and(eq(documentVersions.projectId, projectId), eq(documentVersions.fileId, file.id)),
        );
    }
    await this.db
      .delete(documentFiles)
      .where(and(eq(documentFiles.projectId, projectId), eq(documentFiles.folderId, folderId)));

    return rowToFolder(row);
  }

  async addFile(projectId: string, file: DocumentFile): Promise<DocumentFile> {
    const [row] = await this.db
      .insert(documentFiles)
      .values(fileToRow(projectId, file))
      .returning();
    // Seed an initial version entry so version history is consistent.
    await this.db
      .insert(documentVersions)
      .values({
        id: `${file.id}-v${file.version}`,
        projectId,
        fileId: file.id,
        version: file.version,
        date: file.uploadedAt,
        author: file.uploadedBy,
        note: 'initial',
        versionLocked: false,
        sha256: file.sha256 ?? null,
      })
      .onConflictDoNothing();
    return rowToFile(row);
  }

  async deleteFile(projectId: string, fileId: string): Promise<DocumentFile | null> {
    const [row] = await this.db
      .delete(documentFiles)
      .where(and(eq(documentFiles.projectId, projectId), eq(documentFiles.id, fileId)))
      .returning();
    if (!row) return null;
    await this.db
      .delete(documentVersions)
      .where(and(eq(documentVersions.projectId, projectId), eq(documentVersions.fileId, fileId)));
    return rowToFile(row);
  }

  async uploadVersion(
    projectId: string,
    fileId: string,
    nextVersion: VersionEntry,
  ): Promise<DocumentFile | null> {
    const fileRows = await this.db
      .select()
      .from(documentFiles)
      .where(and(eq(documentFiles.projectId, projectId), eq(documentFiles.id, fileId)))
      .limit(1);
    if (!fileRows[0]) return null;

    await this.db.insert(documentVersions).values({
      id: `${fileId}-v${nextVersion.version}`,
      projectId,
      fileId,
      version: nextVersion.version,
      date: nextVersion.date,
      author: nextVersion.author,
      note: nextVersion.note,
      versionLocked: nextVersion.versionLocked ?? false,
      sha256: nextVersion.sha256 ?? null,
    });

    const [updated] = await this.db
      .update(documentFiles)
      .set({ version: nextVersion.version, uploadedAt: nextVersion.date, uploadedBy: nextVersion.author })
      .where(and(eq(documentFiles.projectId, projectId), eq(documentFiles.id, fileId)))
      .returning();
    return rowToFile(updated);
  }

  async lockVersion(projectId: string, fileId: string): Promise<VersionEntry | null> {
    const versions = await this.db
      .select()
      .from(documentVersions)
      .where(and(eq(documentVersions.projectId, projectId), eq(documentVersions.fileId, fileId)))
      .orderBy(desc(documentVersions.version))
      .limit(1);
    if (!versions[0]) return null;

    const head = versions[0];
    const [locked] = await this.db
      .update(documentVersions)
      .set({ versionLocked: true })
      .where(eq(documentVersions.id, head.id))
      .returning();
    return {
      version: locked.version,
      date: locked.date,
      author: locked.author,
      note: locked.note,
      versionLocked: locked.versionLocked,
      sha256: locked.sha256 ?? undefined,
    };
  }
}

type FolderRow = typeof documentFolders.$inferSelect;
type FileRow = typeof documentFiles.$inferSelect;
type PermissionRow = typeof documentPermissions.$inferSelect;

function rowToFolder(row: FolderRow): Folder {
  return {
    id: row.id,
    name: row.name,
    parentId: row.parentId,
    fileCount: row.fileCount ?? undefined,
    pendingCount: row.pendingCount ?? undefined,
  };
}

function folderToRow(projectId: string, folder: Folder): typeof documentFolders.$inferInsert {
  return {
    id: folder.id,
    projectId,
    name: folder.name,
    parentId: folder.parentId,
    fileCount: folder.fileCount ?? null,
    pendingCount: folder.pendingCount ?? null,
  };
}

function rowToFile(row: FileRow): DocumentFile {
  return {
    id: row.id,
    folderId: row.folderId,
    name: row.name,
    type: row.type,
    version: row.version,
    size: row.size,
    uploadedBy: row.uploadedBy,
    uploadedAt: row.uploadedAt,
    status: row.status as DocStatus,
    workflow: row.workflow,
    sha256: row.sha256 ?? undefined,
    sizeBytes: row.sizeBytes ?? undefined,
    mimeType: row.mimeType ?? undefined,
    virusScanStatus: (row.virusScanStatus ?? undefined) as VirusScanStatus | undefined,
    virusScanCheckedAt: row.virusScanCheckedAt,
    retentionPolicy: (row.retentionPolicy ?? undefined) as DocumentRetentionPolicy | undefined,
    accessPolicy: (row.accessPolicy ?? undefined) as DocumentAccessPolicy | undefined,
  };
}

function fileToRow(projectId: string, file: DocumentFile): typeof documentFiles.$inferInsert {
  return {
    id: file.id,
    projectId,
    folderId: file.folderId,
    name: file.name,
    type: file.type,
    version: file.version,
    size: file.size,
    uploadedBy: file.uploadedBy,
    uploadedAt: file.uploadedAt,
    status: file.status,
    workflow: file.workflow,
    sha256: file.sha256 ?? null,
    sizeBytes: file.sizeBytes ?? null,
    mimeType: file.mimeType ?? null,
    virusScanStatus: file.virusScanStatus ?? null,
    virusScanCheckedAt: file.virusScanCheckedAt ?? null,
    retentionPolicy: file.retentionPolicy ?? null,
    accessPolicy: file.accessPolicy ?? null,
  };
}

function rowToPermission(row: PermissionRow): PermissionEntry {
  return {
    role: row.role,
    upload: row.upload,
    download: row.download,
    edit: row.edit,
    delete: row.delete,
    manageFolder: row.manageFolder,
  };
}
