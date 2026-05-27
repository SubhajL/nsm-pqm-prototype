import { z } from 'zod';

/**
 * Zod schemas for the document + change-request domains
 * (`src/types/document.ts`).
 *
 * `documents/[projectId]` POST is a discriminated union of three actions:
 * create folder, upload file, upload new version.
 * `change-requests` has POST (create) and PATCH (decision).
 */

const userRoleSchema = z.enum([
  'System Admin',
  'Project Manager',
  'Engineer',
  'Coordinator',
  'Team Member',
  'Executive',
  'Consultant',
]);

const documentRetentionPolicySchema = z
  .object({
    retainUntil: z.string().nullable(),
    reason: z.string().nullable(),
  })
  .strict();

const documentAccessPolicySchema = z
  .object({
    read: z.array(userRoleSchema),
    write: z.array(userRoleSchema),
    approve: z.array(userRoleSchema),
  })
  .strict();

export const createDocumentFolderRequestSchema = z
  .object({
    kind: z.literal('folder'),
    name: z.string().min(1, 'name is required'),
    parentId: z.string().nullable(),
  })
  .strict();

export const createDocumentFileRequestSchema = z
  .object({
    kind: z.literal('file'),
    folderId: z.string().min(1, 'folderId is required'),
    name: z.string().min(1, 'name is required'),
    type: z.string().min(1, 'type is required'),
    size: z.string().min(1, 'size is required'),
    /** Optional security metadata (server fills in defaults when absent). */
    sha256: z.string().optional(),
    sizeBytes: z.number().int().nonnegative().optional(),
    mimeType: z.string().optional(),
    retentionPolicy: documentRetentionPolicySchema.optional(),
    accessPolicy: documentAccessPolicySchema.optional(),
  })
  .strict();

export const uploadDocumentVersionRequestSchema = z
  .object({
    kind: z.literal('version'),
    fileId: z.string().min(1, 'fileId is required'),
    note: z.string(),
    /** Optional security metadata for the new version (server fills defaults). */
    sha256: z.string().optional(),
    sizeBytes: z.number().int().nonnegative().optional(),
    mimeType: z.string().optional(),
  })
  .strict();

export const documentWriteRequestSchema = z.discriminatedUnion('kind', [
  createDocumentFolderRequestSchema,
  createDocumentFileRequestSchema,
  uploadDocumentVersionRequestSchema,
]);

export type DocumentWriteRequest = z.infer<typeof documentWriteRequestSchema>;

export const documentDeleteRequestSchema = z.discriminatedUnion('kind', [
  z
    .object({
      kind: z.literal('folder'),
      id: z.string().min(1, 'id is required'),
    })
    .strict(),
  z
    .object({
      kind: z.literal('file'),
      id: z.string().min(1, 'id is required'),
    })
    .strict(),
]);

export type DocumentDeleteRequest = z.infer<typeof documentDeleteRequestSchema>;

const crPrioritySchema = z.enum(['high', 'medium', 'low']);

export const createChangeRequestRequestSchema = z
  .object({
    projectId: z.string().min(1, 'projectId is required'),
    title: z.string().min(1, 'title is required'),
    reason: z.string().min(1, 'reason is required'),
    budgetImpact: z.number(),
    scheduleImpact: z.number(),
    linkedWbs: z.string(),
    priority: crPrioritySchema,
  })
  .strict();

export type CreateChangeRequestRequest = z.infer<
  typeof createChangeRequestRequestSchema
>;

export const decideChangeRequestRequestSchema = z
  .object({
    id: z.string().min(1, 'id is required'),
    action: z.enum(['approve', 'reject', 'return']),
  })
  .strict();

export type DecideChangeRequestRequest = z.infer<
  typeof decideChangeRequestRequestSchema
>;
