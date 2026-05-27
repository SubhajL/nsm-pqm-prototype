import { recordAuditEvent } from '@/lib/audit-helpers';
import { getSignedDocumentUrl } from '@/lib/mock-upload-storage';
import {
  addDocumentFile,
  addDocumentFolder,
  deleteDocumentFile,
  deleteDocumentFolder,
  getDocumentDataForProject,
  uploadDocumentVersion,
} from '@/lib/document-store';
import {
  canPerformProjectAction,
  forbiddenResponse,
  getCurrentApiUser,
  requireProjectAccess,
} from '@/lib/project-api-access';
import { ensureProjectDemoStateHydrated, persistProjectDemoState } from '@/lib/project-demo-state';
import { parseRequestBody } from '@/lib/validation';
import type { DocumentFile, Folder, VersionEntry } from '@/types/document';
import {
  documentDeleteRequestSchema,
  documentWriteRequestSchema,
} from '@/types/document.schema';

export async function GET(
  _request: Request,
  { params }: { params: { projectId: string } },
) {
  await new Promise((resolve) => setTimeout(resolve, 150));
  await ensureProjectDemoStateHydrated();
  const forbidden = requireProjectAccess(params.projectId);
  if (forbidden) return forbidden;

  return Response.json({ status: 'success', data: getDocumentDataForProject(params.projectId) });
}

export async function POST(
  request: Request,
  { params }: { params: { projectId: string } },
) {
  await new Promise((resolve) => setTimeout(resolve, 150));
  await ensureProjectDemoStateHydrated();
  const rawBody: unknown = await request.json().catch(() => null);
  const parsed = parseRequestBody(documentWriteRequestSchema, rawBody);
  if (!parsed.success) return parsed.response;

  const forbidden = requireProjectAccess(params.projectId);
  if (forbidden) return forbidden;

  const currentUser = getCurrentApiUser();

  if (!canPerformProjectAction(currentUser, params.projectId, 'upload_document')) {
    return forbiddenResponse('upload_document');
  }

  const body = parsed.data;

  if (body.kind === 'folder') {
    const folder: Folder = {
      id: `folder-${crypto.randomUUID()}`,
      name: body.name,
      parentId: body.parentId,
      fileCount: 0,
    };

    addDocumentFolder(params.projectId, folder);
    await persistProjectDemoState();
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

    addDocumentFile(params.projectId, file);
    await persistProjectDemoState();
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

  const currentData = getDocumentDataForProject(params.projectId);
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

  const updatedFile = uploadDocumentVersion(params.projectId, body.fileId, nextVersion);
  if (updatedFile) {
    updatedFile.sha256 = body.sha256 ?? updatedFile.sha256;
    updatedFile.sizeBytes = body.sizeBytes ?? updatedFile.sizeBytes;
    updatedFile.mimeType = body.mimeType ?? updatedFile.mimeType;
    updatedFile.virusScanStatus = body.sha256 ? 'clean' : updatedFile.virusScanStatus;
    updatedFile.virusScanCheckedAt = body.sha256
      ? new Date().toISOString()
      : updatedFile.virusScanCheckedAt ?? null;
  }
  await persistProjectDemoState();
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

export async function DELETE(
  request: Request,
  { params }: { params: { projectId: string } },
) {
  await new Promise((resolve) => setTimeout(resolve, 150));
  await ensureProjectDemoStateHydrated();
  const rawBody: unknown = await request.json().catch(() => null);
  const parsed = parseRequestBody(documentDeleteRequestSchema, rawBody);
  if (!parsed.success) return parsed.response;

  const forbidden = requireProjectAccess(params.projectId);
  if (forbidden) return forbidden;

  const currentUser = getCurrentApiUser();

  if (!canPerformProjectAction(currentUser, params.projectId, 'upload_document')) {
    return forbiddenResponse('upload_document');
  }

  const body = parsed.data;

  if (body.kind === 'folder') {
    const deletedFolder = deleteDocumentFolder(params.projectId, body.id);

    if (!deletedFolder) {
      return Response.json(
        { status: 'error', error: { code: 'NOT_FOUND', message: 'Folder not found' } },
        { status: 404 },
      );
    }

    await persistProjectDemoState();
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

  const deletedFile = deleteDocumentFile(params.projectId, body.id);

  if (!deletedFile) {
    return Response.json(
      { status: 'error', error: { code: 'NOT_FOUND', message: 'File not found' } },
      { status: 404 },
    );
  }

  await persistProjectDemoState();
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
