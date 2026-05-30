import { recordAuditEvent } from '@/lib/audit-helpers';
import { getSignedDocumentUrl } from '@/lib/mock-upload-storage';
import { getRepositories } from '@/lib/repositories';
import {
  canPerformProjectAction,
  forbiddenResponse,
  getCurrentApiUser,
  requireProjectAccess,
} from '@/lib/project-api-access';
/**
 * PR-06: Short-lived signed-URL redirect for private document blobs.
 *
 * - 401 if the caller is not authenticated.
 * - 403 if they cannot view this project or lack `view_document`.
 * - 404 if the file is missing.
 * - 302 to a 5-min signed URL otherwise.
 *
 * Emits a `view_document` audit event on every successful redirect so
 * the operations team has a record of who fetched which file when.
 */
export async function GET(
  request: Request,
  { params }: { params: { projectId: string; fileId: string } },
) {
  const forbidden = requireProjectAccess(params.projectId);
  if (forbidden) return forbidden;

  const currentUser = getCurrentApiUser();

  if (!canPerformProjectAction(currentUser, params.projectId, 'view_document')) {
    return forbiddenResponse('view_document');
  }

  const projectData = await getRepositories().documents.getDataForProject(params.projectId);
  const file = projectData.files.find((entry) => entry.id === params.fileId);

  if (!file) {
    return Response.json(
      {
        status: 'error',
        error: { code: 'NOT_FOUND', message: `Document ${params.fileId} not found` },
      },
      { status: 404 },
    );
  }

  const blobKey = `documents/${params.projectId}/${file.id}`;
  const signedUrl = getSignedDocumentUrl(blobKey, 300);

  await recordAuditEvent(request, {
    action: 'view_document',
    resourceType: 'document_file',
    resourceId: file.id,
    projectId: params.projectId,
    before: null,
    after: { fileId: file.id, name: file.name, sha256: file.sha256 ?? null },
    decisionReason: `view document ${file.name}`,
    authorityBasis: 'AUTHZ_MATRIX:view_document',
    actor: currentUser,
  });

  return Response.redirect(new URL(signedUrl, request.url).toString(), 302);
}
