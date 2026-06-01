export const dynamic = 'force-dynamic';

import { recordAuditEvent } from '@/lib/audit-helpers';
import { getSignedDocumentUrl } from '@/lib/mock-upload-storage';
import {
  canPerformProjectAction,
  forbiddenResponse,
  getCurrentApiUser,
  requireProjectAccess,
} from '@/lib/project-api-access';
import { getRepositories } from '@/lib/repositories';
import { parseRequestBody } from '@/lib/validation';
import type { DocumentFile, Folder, VersionEntry } from '@/types/document';
import {
  documentDeleteRequestSchema,
  documentPatchRequestSchema,
  documentWriteRequestSchema,
} from '@/types/document.schema';

export async function GET(
  _request: Request,
  { params }: { params: { projectId: string } },
) {
  await new Promise((resolve) => setTimeout(resolve, 150));
  const forbidden = await requireProjectAccess(params.projectId);
  if (forbidden) return forbidden;

  const data = await getRepositories().documents.getDataForProject(params.projectId);
  return Response.json({ status: 'success', data });
}

export async function POST(
  request: Request,
  { params }: { params: { projectId: string } },
) {
  await new Promise((resolve) => setTimeout(resolve, 150));
  const rawBody: unknown = await request.json().catch(() => null);
  const parsed = parseRequestBody(documentWriteRequestSchema, rawBody);
  if (!parsed.success) return parsed.response;

  const forbidden = await requireProjectAccess(params.projectId);
  if (forbidden) return forbidden;

  const currentUser = await getCurrentApiUser();

  if (!(await canPerformProjectAction(currentUser, params.projectId, 'upload_document'))) {
    return forbiddenResponse('upload_document');
  }

  const body = parsed.data;
  const repos = getRepositories();

  if (body.kind === 'folder') {
    const folder: Folder = {
      id: `folder-${crypto.randomUUID()}`,
      name: body.name,
      parentId: body.parentId,
      fileCount: 0,
    };

    await repos.documents.addFolder(params.projectId, folder);
    await recordAuditEvent(request, {
      action: 'upload_document',
      resourceType: 'document_folder',
      resourceId: folder.id,
      projectId: params.projectId,
      before: null,
      after: folder,
      decisionReason: `create folder ${folder.name}`,
      authorityBasis: 'AUTHZ_MATRIX:upload_document',
      actor: currentUser,
    });
    return Response.json({ status: 'success', data: folder }, { status: 201 });
  }

  if (body.kind === 'file') {
    const file: DocumentFile = {
      id: `file-${crypto.randomUUID()}`,
      folderId: body.folderId,
      name: body.name,
      type: body.type,
      version: 1,
      size: body.size,
      uploadedBy: currentUser?.name ?? 'System',
      uploadedAt: new Date().toISOString(),
      status: 'draft',
      workflow: ['submitted', 'pending', 'pending'],
      sha256: body.sha256,
      sizeBytes: body.sizeBytes,
      mimeType: body.mimeType,
      virusScanStatus: body.sha256 ? 'clean' : 'pending',
      virusScanCheckedAt: body.sha256 ? new Date().toISOString() : null,
      retentionPolicy: body.retentionPolicy ?? { retainUntil: null, reason: null },
      accessPolicy: body.accessPolicy,
    };

    await repos.documents.addFile(params.projectId, file);
    await recordAuditEvent(request, {
      action: 'upload_document',
      resourceType: 'document_file',
      resourceId: file.id,
      projectId: params.projectId,
      before: null,
      after: file,
      decisionReason: `upload file ${file.name}`,
      authorityBasis: 'AUTHZ_MATRIX:upload_document',
      actor: currentUser,
    });

    // For files persisted to Vercel Blob with `access:'private'`, the
    // raw URL would be inaccessible. The server-issued `signedUrl`
    // grants the client a 5-min window through `/api/documents/_blob/signed`.
    const signedUrl = body.sha256
      ? getSignedDocumentUrl(`documents/${params.projectId}/${file.id}`)
      : null;

    return Response.json(
      { status: 'success', data: { ...file, signedUrl } },
      { status: 201 },
    );
  }

  const currentData = await repos.documents.getDataForProject(params.projectId);
  const currentFile = currentData.files.find((entry) => entry.id === body.fileId);

  if (!currentFile) {
    return Response.json(
      { status: 'error', error: { code: 'NOT_FOUND', message: 'Document file not found' } },
      { status: 404 },
    );
  }

  // PR-06: Version lock. If the current file is approved (or the head
  // VersionEntry is explicitly locked), refuse to overwrite it.
  const versionEntries = currentData.versionHistory[currentFile.id] ?? [];
  const headVersion = versionEntries[0];
  const isLocked =
    headVersion?.versionLocked === true ||
    (headVersion === undefined && currentFile.status === 'approved') ||
    (headVersion?.version === currentFile.version && currentFile.status === 'approved');

  if (isLocked) {
    return Response.json(
      {
        status: 'error',
        error: {
          code: 'VERSION_LOCKED',
          message:
            'Cannot upload new version: current approved version is locked. Create a new file or request unlock.',
        },
      },
      { status: 409 },
    );
  }

  const beforeFile = structuredClone(currentFile);
  const nextVersion: VersionEntry = {
    version: currentFile.version + 1,
    date: new Date().toISOString(),
    author: currentUser?.name ?? 'System',
    note: body.note,
    sha256: body.sha256,
    versionLocked: false,
  };

  const baseUpdatedFile = await repos.documents.uploadVersion(
    params.projectId,
    body.fileId,
    nextVersion,
  );
  let updatedFile = baseUpdatedFile;
  if (baseUpdatedFile) {
    const overlay: Partial<DocumentFile> = {
      sha256: body.sha256 ?? baseUpdatedFile.sha256,
      sizeBytes: body.sizeBytes ?? baseUpdatedFile.sizeBytes,
      mimeType: body.mimeType ?? baseUpdatedFile.mimeType,
      virusScanStatus: body.sha256 ? 'clean' : baseUpdatedFile.virusScanStatus,
      virusScanCheckedAt: body.sha256
        ? new Date().toISOString()
        : baseUpdatedFile.virusScanCheckedAt ?? null,
    };
    updatedFile = await repos.documents.updateFileMetadata(
      params.projectId,
      body.fileId,
      overlay,
    );
  }
  await recordAuditEvent(request, {
    action: 'upload_document',
    resourceType: 'document_file',
    resourceId: currentFile.id,
    projectId: params.projectId,
    before: beforeFile,
    after: updatedFile,
    decisionReason: `upload new version v${nextVersion.version} of ${currentFile.name}`,
    authorityBasis: 'AUTHZ_MATRIX:upload_document',
    actor: currentUser,
  });

  const signedUrl = body.sha256
    ? getSignedDocumentUrl(`documents/${params.projectId}/${currentFile.id}`)
    : null;

  return Response.json({ status: 'success', data: { ...updatedFile, signedUrl } });
}

/**
 * PR-Docs1 — PATCH for rename folder, rename file, and move file. All three
 * sub-actions share `upload_document` as the gating authz action so the
 * existing matrix entries cover them without an enum extension.
 */
export async function PATCH(
  request: Request,
  { params }: { params: { projectId: string } },
) {
  await new Promise((resolve) => setTimeout(resolve, 150));
  const rawBody: unknown = await request.json().catch(() => null);
  const parsed = parseRequestBody(documentPatchRequestSchema, rawBody);
  if (!parsed.success) return parsed.response;

  const forbidden = await requireProjectAccess(params.projectId);
  if (forbidden) return forbidden;

  const currentUser = await getCurrentApiUser();

  if (!(await canPerformProjectAction(currentUser, params.projectId, 'upload_document'))) {
    return forbiddenResponse('upload_document');
  }

  const body = parsed.data;
  const repos = getRepositories();

  if (body.kind === 'rename_folder') {
    const currentData = await repos.documents.getDataForProject(params.projectId);
    const existingFolder = currentData.folders.find((entry) => entry.id === body.id);

    if (!existingFolder) {
      return Response.json(
        { status: 'error', error: { code: 'NOT_FOUND', message: 'Folder not found' } },
        { status: 404 },
      );
    }

    const beforeFolder = structuredClone(existingFolder);
    const updated = await repos.documents.renameFolder(params.projectId, body.id, body.name);

    if (!updated) {
      return Response.json(
        { status: 'error', error: { code: 'NOT_FOUND', message: 'Folder not found' } },
        { status: 404 },
      );
    }

    await recordAuditEvent(request, {
      action: 'upload_document',
      resourceType: 'document_folder',
      resourceId: updated.id,
      projectId: params.projectId,
      before: beforeFolder,
      after: updated,
      decisionReason: `rename folder ${beforeFolder.name} → ${updated.name}`,
      authorityBasis: 'AUTHZ_MATRIX:upload_document',
      actor: currentUser,
    });
    return Response.json({ status: 'success', data: updated });
  }

  if (body.kind === 'rename_file') {
    const currentData = await repos.documents.getDataForProject(params.projectId);
    const existingFile = currentData.files.find((entry) => entry.id === body.id);

    if (!existingFile) {
      return Response.json(
        { status: 'error', error: { code: 'NOT_FOUND', message: 'File not found' } },
        { status: 404 },
      );
    }

    const beforeFile = structuredClone(existingFile);
    const updated = await repos.documents.updateFileMetadata(params.projectId, body.id, {
      name: body.name,
    });

    if (!updated) {
      return Response.json(
        { status: 'error', error: { code: 'NOT_FOUND', message: 'File not found' } },
        { status: 404 },
      );
    }

    await recordAuditEvent(request, {
      action: 'upload_document',
      resourceType: 'document_file',
      resourceId: updated.id,
      projectId: params.projectId,
      before: beforeFile,
      after: updated,
      decisionReason: `rename file ${beforeFile.name} → ${updated.name}`,
      authorityBasis: 'AUTHZ_MATRIX:upload_document',
      actor: currentUser,
    });
    return Response.json({ status: 'success', data: updated });
  }

  // move_file
  const currentData = await repos.documents.getDataForProject(params.projectId);
  const existingFile = currentData.files.find((entry) => entry.id === body.id);

  if (!existingFile) {
    return Response.json(
      { status: 'error', error: { code: 'NOT_FOUND', message: 'File not found' } },
      { status: 404 },
    );
  }

  // Validate the target folder exists in this project — refuse to create
  // dangling `folder_id` references.
  const targetFolderExists = currentData.folders.some((entry) => entry.id === body.toFolderId);
  if (!targetFolderExists) {
    return Response.json(
      {
        status: 'error',
        error: { code: 'NOT_FOUND', message: 'Target folder not found' },
      },
      { status: 404 },
    );
  }

  const beforeFile = structuredClone(existingFile);
  const updated = await repos.documents.updateFileMetadata(params.projectId, body.id, {
    folderId: body.toFolderId,
  });

  if (!updated) {
    return Response.json(
      { status: 'error', error: { code: 'NOT_FOUND', message: 'File not found' } },
      { status: 404 },
    );
  }

  await recordAuditEvent(request, {
    action: 'upload_document',
    resourceType: 'document_file',
    resourceId: updated.id,
    projectId: params.projectId,
    before: beforeFile,
    after: updated,
    decisionReason: `move file ${updated.name} from ${beforeFile.folderId} to ${body.toFolderId}`,
    authorityBasis: 'AUTHZ_MATRIX:upload_document',
    actor: currentUser,
  });
  return Response.json({ status: 'success', data: updated });
}

export async function DELETE(
  request: Request,
  { params }: { params: { projectId: string } },
) {
  await new Promise((resolve) => setTimeout(resolve, 150));
  const rawBody: unknown = await request.json().catch(() => null);
  const parsed = parseRequestBody(documentDeleteRequestSchema, rawBody);
  if (!parsed.success) return parsed.response;

  const forbidden = await requireProjectAccess(params.projectId);
  if (forbidden) return forbidden;

  const currentUser = await getCurrentApiUser();

  if (!(await canPerformProjectAction(currentUser, params.projectId, 'upload_document'))) {
    return forbiddenResponse('upload_document');
  }

  const body = parsed.data;
  const repos = getRepositories();

  if (body.kind === 'folder') {
    const deletedFolder = await repos.documents.deleteFolder(params.projectId, body.id);

    if (!deletedFolder) {
      return Response.json(
        { status: 'error', error: { code: 'NOT_FOUND', message: 'Folder not found' } },
        { status: 404 },
      );
    }
    await recordAuditEvent(request, {
      action: 'upload_document',
      resourceType: 'document_folder',
      resourceId: deletedFolder.id,
      projectId: params.projectId,
      before: deletedFolder,
      after: null,
      decisionReason: `delete folder ${deletedFolder.name}`,
      authorityBasis: 'AUTHZ_MATRIX:upload_document',
      actor: currentUser,
    });
    return Response.json({ status: 'success', data: deletedFolder });
  }

  const deletedFile = await repos.documents.deleteFile(params.projectId, body.id);

  if (!deletedFile) {
    return Response.json(
      { status: 'error', error: { code: 'NOT_FOUND', message: 'File not found' } },
      { status: 404 },
    );
  }
  await recordAuditEvent(request, {
    action: 'upload_document',
    resourceType: 'document_file',
    resourceId: deletedFile.id,
    projectId: params.projectId,
    before: deletedFile,
    after: null,
    decisionReason: `delete file ${deletedFile.name}`,
    authorityBasis: 'AUTHZ_MATRIX:upload_document',
    actor: currentUser,
  });
  return Response.json({ status: 'success', data: deletedFile });
}
