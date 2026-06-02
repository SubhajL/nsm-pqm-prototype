export const dynamic = 'force-dynamic';

import { recordAuditEvent } from '@/lib/audit-helpers';
import {
  canPerformProjectAction,
  forbiddenResponse,
  getCurrentApiUser,
  requireProjectAccess,
} from '@/lib/project-api-access';
import { applyItpStatusSync } from '@/lib/quality-consistency';
import { transitionInspection } from '@/lib/quality/inspection-workflow';
import { getRepositories } from '@/lib/repositories';
import { parseRequestBody } from '@/lib/validation';
import { patchInspectionRequestSchema } from '@/types/quality.schema';
import type { InspectionRecord, WorkflowStatus } from '@/types/quality';

/**
 * PATCH /api/quality/inspections/[id]
 *
 * PR-PRQM-K — Edit endpoint for inspection metadata. The existing
 * collection-level PATCH at `/api/quality/inspections` covers the
 * checklist-item-resolve + draft→confirmed→signed workflow transitions;
 * this route is the simpler "edit overallResult / failReason / workflow
 * status / checklist" surface used by the inspection edit modal.
 *
 * Body (all optional, at least one required):
 *   - `overallResult` — 'pass' | 'conditional'
 *   - `failReason` — string
 *   - `workflowStatus` — 'draft' | 'confirmed' | 'signed' (state-machine guarded)
 *   - `checklist` — full InspectionChecklistItem[] replacement
 *
 * Auth: project visibility on the inspection's project + `edit_quality_inspection`.
 */

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } },
) {
  const rawBody: unknown = await request.json().catch(() => null);
  const parsed = parseRequestBody(patchInspectionRequestSchema, rawBody);
  if (!parsed.success) return parsed.response;

  const repos = getRepositories();
  const record = await repos.qualityInspections.findInspectionById(params.id);

  if (!record) {
    return Response.json(
      {
        status: 'error',
        error: {
          code: 'NOT_FOUND',
          message: `Inspection ${params.id} not found`,
        },
      },
      { status: 404 },
    );
  }

  const forbidden = await requireProjectAccess(record.projectId);
  if (forbidden) return forbidden;

  const currentUser = await getCurrentApiUser();
  if (
    !(await canPerformProjectAction(
      currentUser,
      record.projectId,
      'edit_quality_inspection',
    ))
  ) {
    return forbiddenResponse('edit_quality_inspection');
  }

  const before = structuredClone(record);
  const body = parsed.data;

  // Workflow-status transition guard via shared pure helper. Only runs when
  // the caller is actually changing the status; same-status PATCH is a no-op
  // pass-through for the other metadata fields.
  if (body.workflowStatus && body.workflowStatus !== (record.workflowStatus ?? 'draft')) {
    const currentStatus: WorkflowStatus = record.workflowStatus ?? 'draft';
    const transition = transitionInspection({
      from: currentStatus,
      to: body.workflowStatus,
      checklist: body.checklist ?? record.checklist,
    });
    if (!transition.ok) {
      const httpStatus = transition.code === 'INVALID_TRANSITION' ? 409 : 400;
      const errorCode = transition.code === 'INVALID_TRANSITION' ? 'INVALID_TRANSITION' : 'BAD_REQUEST';
      return Response.json(
        {
          status: 'error',
          error: { code: errorCode, message: transition.message },
        },
        { status: httpStatus },
      );
    }
  }

  const patch: Partial<InspectionRecord> = {};
  if (body.overallResult !== undefined) patch.overallResult = body.overallResult;
  if (body.failReason !== undefined) patch.failReason = body.failReason;
  if (body.workflowStatus !== undefined) patch.workflowStatus = body.workflowStatus;
  if (body.checklist !== undefined) patch.checklist = body.checklist;

  const updated =
    (await repos.qualityInspections.updateInspection(record.id, patch)) ?? record;

  // Keep linked ITP status in sync when the result band changes.
  if (body.overallResult !== undefined || body.checklist !== undefined) {
    await applyItpStatusSync(repos);
  }

  await recordAuditEvent(request, {
    action: 'edit_quality_inspection',
    resourceType: 'quality_inspection',
    resourceId: record.id,
    projectId: record.projectId,
    before,
    after: updated,
    decisionReason: 'patch inspection metadata',
    authorityBasis: 'AUTHZ_MATRIX:edit_quality_inspection',
    actor: currentUser,
  });

  return Response.json({ status: 'success', data: updated });
}
