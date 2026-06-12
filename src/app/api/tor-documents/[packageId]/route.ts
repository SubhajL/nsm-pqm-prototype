export const dynamic = 'force-dynamic';

import { recordAuditEvent } from '@/lib/audit-helpers';
import {
  canPerformProjectAction,
  forbiddenResponse,
  getCurrentApiUser,
  requireProjectAccess,
} from '@/lib/project-api-access';
import { getRepositories } from '@/lib/repositories';
import { isUniqueViolation } from '@/lib/state-conflict';
import { parseRequestBody } from '@/lib/validation';
import type { TorDocument } from '@/types/tor-document';
import { createTorDocumentRequestSchema } from '@/types/tor-document.schema';

/**
 * Auth helper: resolve the project that owns a ProcurementPackage so we
 * can run the standard project-scoped access checks.
 */
async function resolveProjectId(packageId: string): Promise<string | null> {
  const pkg = await getRepositories().procurementPackages.findById(packageId);
  return pkg?.projectId ?? null;
}

function packageNotFound(packageId: string): Response {
  return Response.json(
    {
      status: 'error',
      error: {
        code: 'NOT_FOUND',
        message: `Procurement package ${packageId} not found`,
      },
    },
    { status: 404 },
  );
}

/**
 * GET /api/tor-documents/[packageId] — list TOR revisions for a package.
 */
export async function GET(
  _request: Request,
  { params }: { params: { packageId: string } },
) {
  const projectId = await resolveProjectId(params.packageId);
  if (!projectId) return packageNotFound(params.packageId);

  const forbidden = await requireProjectAccess(projectId);
  if (forbidden) return forbidden;

  const list = await getRepositories().torDocuments.listByProcurementPackage(
    params.packageId,
  );
  return Response.json({ status: 'success', data: list });
}

/**
 * POST /api/tor-documents/[packageId] — file a new TOR revision.
 *
 * Authz: requires `edit_basic` on the parent project.
 */
export async function POST(
  request: Request,
  { params }: { params: { packageId: string } },
) {
  const rawBody: unknown = await request.json().catch(() => null);
  const parsed = parseRequestBody(createTorDocumentRequestSchema, rawBody);
  if (!parsed.success) return parsed.response;

  const projectId = await resolveProjectId(params.packageId);
  if (!projectId) return packageNotFound(params.packageId);

  const forbidden = await requireProjectAccess(projectId);
  if (forbidden) return forbidden;

  const currentUser = await getCurrentApiUser();
  if (!(await canPerformProjectAction(currentUser, projectId, 'edit_basic'))) {
    return forbiddenResponse('edit_basic');
  }

  const body = parsed.data;
  const repos = getRepositories();

  // PR-34 — `version` is server-assigned: latest + 1 per package. If a
  // concurrent filer wins the unique index (23505), recompute once —
  // the intent is "append a new revision", so a retry preserves it.
  let created: TorDocument | null = null;
  for (let attempt = 0; attempt < 2 && created === null; attempt += 1) {
    const latest = await repos.torDocuments.findLatestByProcurementPackage(
      params.packageId,
    );
    const newTor: TorDocument = {
      id: `tor-${crypto.randomUUID()}`,
      procurementPackageId: params.packageId,
      version: (latest?.version ?? 0) + 1,
      scopeSummary: body.scopeSummary.trim(),
      technicalRequirements: body.technicalRequirements.trim(),
      deliverySchedule: body.deliverySchedule.trim(),
      evaluationCriteria: body.evaluationCriteria.trim(),
      documentFileId: body.documentFileId ?? null,
      approvedAt: body.approvedAt ?? null,
    };
    try {
      created = await repos.torDocuments.create(newTor);
    } catch (error) {
      if (!isUniqueViolation(error)) throw error;
    }
  }
  if (created === null) {
    return Response.json(
      {
        status: 'error',
        error: {
          code: 'SEQUENCE_CONFLICT',
          message:
            'มีการยื่น TOR ฉบับใหม่พร้อมกันโดยผู้ใช้อื่น (concurrent TOR filing) — โปรดลองอีกครั้ง (retry)',
        },
      },
      { status: 409 },
    );
  }
  await recordAuditEvent(request, {
    action: 'edit_tor_document',
    resourceType: 'tor_document',
    resourceId: created.id,
    projectId,
    before: null,
    after: created,
    decisionReason: `file TOR v${created.version}`,
    authorityBasis: 'AUTHZ_MATRIX:edit_basic',
    actor: currentUser,
  });

  return Response.json({ status: 'success', data: created }, { status: 201 });
}
