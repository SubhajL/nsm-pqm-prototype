import { boolean, integer, jsonb, pgTable, text } from 'drizzle-orm/pg-core';

import type {
  DocStatus,
  DocumentAccessPolicy,
  DocumentRetentionPolicy,
  PermissionEntry,
  VirusScanStatus,
} from '@/types/document';

/**
 * Documents are organised per-project. Three tables hold the per-project
 * shape ("folders + files + version history"):
 *   - `document_folders` — one row per folder
 *   - `document_files` — one row per file with full metadata + optional jsonb
 *     overlays for retention/access policies
 *   - `document_versions` — append rows per file id (head = latest by version
 *     desc)
 *   - `document_permissions` — per-project role permission rows
 */

export const documentFolders = pgTable('document_folders', {
  id: text('id').primaryKey(),
  projectId: text('project_id').notNull(),
  name: text('name').notNull(),
  parentId: text('parent_id'),
  fileCount: integer('file_count'),
  pendingCount: integer('pending_count'),
});

export type DocumentFolderRow = typeof documentFolders.$inferSelect;
export type DocumentFolderInsert = typeof documentFolders.$inferInsert;

export const documentFiles = pgTable('document_files', {
  id: text('id').primaryKey(),
  projectId: text('project_id').notNull(),
  folderId: text('folder_id').notNull(),
  name: text('name').notNull(),
  type: text('type').notNull(),
  version: integer('version').notNull(),
  size: text('size').notNull(),
  uploadedBy: text('uploaded_by').notNull(),
  uploadedAt: text('uploaded_at').notNull(),
  status: text('status').$type<DocStatus>().notNull(),
  workflow: jsonb('workflow').$type<string[]>().notNull().default([]),
  sha256: text('sha256'),
  sizeBytes: integer('size_bytes'),
  mimeType: text('mime_type'),
  virusScanStatus: text('virus_scan_status').$type<VirusScanStatus>(),
  virusScanCheckedAt: text('virus_scan_checked_at'),
  retentionPolicy: jsonb('retention_policy').$type<DocumentRetentionPolicy>(),
  accessPolicy: jsonb('access_policy').$type<DocumentAccessPolicy>(),
});

export type DocumentFileRow = typeof documentFiles.$inferSelect;
export type DocumentFileInsert = typeof documentFiles.$inferInsert;

export const documentVersions = pgTable('document_versions', {
  id: text('id').primaryKey(), // synthetic — `${fileId}-v${version}`
  projectId: text('project_id').notNull(),
  fileId: text('file_id').notNull(),
  version: integer('version').notNull(),
  date: text('date').notNull(),
  author: text('author').notNull(),
  note: text('note').notNull(),
  versionLocked: boolean('version_locked').notNull().default(false),
  sha256: text('sha256'),
});

export type DocumentVersionRow = typeof documentVersions.$inferSelect;
export type DocumentVersionInsert = typeof documentVersions.$inferInsert;

export const documentPermissions = pgTable('document_permissions', {
  id: text('id').primaryKey(), // synthetic — `${projectId}:${role}`
  projectId: text('project_id').notNull(),
  role: text('role').notNull(),
  upload: boolean('upload').notNull(),
  download: boolean('download').notNull(),
  edit: boolean('edit').notNull(),
  delete: boolean('delete').notNull(),
  manageFolder: boolean('manage_folder').notNull(),
});

export type DocumentPermissionRow = typeof documentPermissions.$inferSelect;
export type DocumentPermissionInsert = typeof documentPermissions.$inferInsert;

// Re-export the source shape for callers that need to know the exact
// projection used to recompose `DocumentData` from these tables.
export type { PermissionEntry };
