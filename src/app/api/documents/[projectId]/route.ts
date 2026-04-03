import { appendAuditLog } from '@/lib/audit-log-store';
import {
  addDocumentFile,
  addDocumentFolder,
  deleteDocumentFile,
  deleteDocumentFolder,
  getDocumentDataForProject,
  uploadDocumentVersion,
} from '@/lib/document-store';
import { getCurrentApiUser, requireProjectAccess } from '@/lib/project-api-access';
import type { DocumentFile, Folder, VersionEntry } from '@/types/document';

export async function GET(
  _request: Request,
  { params }: { params: { projectId: string } },
) {
  await new Promise((resolve) => setTimeout(resolve, 150));
  const forbidden = requireProjectAccess(params.projectId);
  if (forbidden) return forbidden;

  return Response.json({ status: 'success', data: getDocumentDataForProject(params.projectId) });
}

export async function POST(
  request: Request,
  { params }: { params: { projectId: string } },
) {
  await new Promise((resolve) => setTimeout(resolve, 150));
  const forbidden = requireProjectAccess(params.projectId);
  if (forbidden) return forbidden;

  const currentUser = getCurrentApiUser();
  const body = (await request.json()) as
    | { kind: 'folder'; name: string; parentId: string | null }
    | { kind: 'file'; folderId: string; name: string; type: string; size: string }
    | { kind: 'version'; fileId: string; note: string };

  if (body.kind === 'folder') {
    const folder: Folder = {
      id: `folder-${crypto.randomUUID()}`,
      name: body.name,
      parentId: body.parentId,
      fileCount: 0,
    };

    addDocumentFolder(params.projectId, folder);
    appendAuditLog(currentUser, 'Document', `สร้างโฟลเดอร์ ${folder.name}`);
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
    };

    addDocumentFile(params.projectId, file);
    appendAuditLog(currentUser, 'Document', `อัปโหลดไฟล์ ${file.name}`);
    return Response.json({ status: 'success', data: file }, { status: 201 });
  }

  const currentData = getDocumentDataForProject(params.projectId);
  const currentFile = currentData.files.find((entry) => entry.id === body.fileId);

  if (!currentFile) {
    return Response.json(
      { status: 'error', error: { code: 'NOT_FOUND', message: 'Document file not found' } },
      { status: 404 },
    );
  }

  const nextVersion: VersionEntry = {
    version: currentFile.version + 1,
    date: new Date().toISOString(),
    author: currentUser?.name ?? 'System',
    note: body.note,
  };

  const updatedFile = uploadDocumentVersion(params.projectId, body.fileId, nextVersion);
  appendAuditLog(currentUser, 'Document', `อัปโหลดเวอร์ชันใหม่ ${currentFile.name}`);
  return Response.json({ status: 'success', data: updatedFile });
}

export async function DELETE(
  request: Request,
  { params }: { params: { projectId: string } },
) {
  await new Promise((resolve) => setTimeout(resolve, 150));
  const forbidden = requireProjectAccess(params.projectId);
  if (forbidden) return forbidden;

  const currentUser = getCurrentApiUser();
  const body = (await request.json()) as
    | { kind: 'folder'; id: string }
    | { kind: 'file'; id: string };

  if (body.kind === 'folder') {
    const deletedFolder = deleteDocumentFolder(params.projectId, body.id);

    if (!deletedFolder) {
      return Response.json(
        { status: 'error', error: { code: 'NOT_FOUND', message: 'Folder not found' } },
        { status: 404 },
      );
    }

    appendAuditLog(currentUser, 'Document', `ลบโฟลเดอร์ ${deletedFolder.name}`);
    return Response.json({ status: 'success', data: deletedFolder });
  }

  const deletedFile = deleteDocumentFile(params.projectId, body.id);

  if (!deletedFile) {
    return Response.json(
      { status: 'error', error: { code: 'NOT_FOUND', message: 'File not found' } },
      { status: 404 },
    );
  }

  appendAuditLog(currentUser, 'Document', `ลบไฟล์ ${deletedFile.name}`);
  return Response.json({ status: 'success', data: deletedFile });
}
