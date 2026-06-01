export const dynamic = 'force-dynamic';

import { recordAuditEvent } from '@/lib/audit-helpers';
import {
  canPerformProjectAction,
  forbiddenResponse,
  getCurrentApiUser,
  requireProjectAccess,
} from '@/lib/project-api-access';
import { getRepositories } from '@/lib/repositories';
import { parseRequestBody } from '@/lib/validation';
import {
  createBoqItemRequestSchema,
  deleteBoqItemRequestSchema,
  updateBoqItemRequestSchema,
} from '@/types/boq.schema';
import { isOutsourcedProject } from '@/types/project';

interface BOQItem {
  id: string;
  wbsId: string;
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  total: number;
}

export async function GET(
  _request: Request,
  { params }: { params: { wbsId: string } },
) {
  await new Promise((resolve) => setTimeout(resolve, 150));
  const repos = getRepositories();
  const wbsNode = await repos.wbs.findById(params.wbsId);

  if (!wbsNode) {
    return Response.json(
      {
        status: 'error',
        error: { code: 'NOT_FOUND', message: `WBS ${params.wbsId} not found` },
      },
      { status: 404 },
    );
  }

  const forbidden = await requireProjectAccess(wbsNode.projectId);
  if (forbidden) return forbidden;

  const filtered = await repos.boq.listByWbs(params.wbsId);

  return Response.json({ status: 'success', data: filtered });
}

export async function POST(
  request: Request,
  { params }: { params: { wbsId: string } },
) {
  await new Promise((resolve) => setTimeout(resolve, 150));
  const repos = getRepositories();

  const rawBody: unknown = await request.json().catch(() => null);
  const parsed = parseRequestBody(createBoqItemRequestSchema, rawBody);
  if (!parsed.success) return parsed.response;
  const body = parsed.data;

  const wbsNode = await repos.wbs.findById(params.wbsId);

  if (!wbsNode) {
    return Response.json(
      {
        status: 'error',
        error: { code: 'NOT_FOUND', message: `WBS ${params.wbsId} not found` },
      },
      { status: 404 },
    );
  }

  const forbidden = await requireProjectAccess(wbsNode.projectId);
  if (forbidden) return forbidden;

  const currentUser = await getCurrentApiUser();

  if (!(await canPerformProjectAction(currentUser, wbsNode.projectId, 'edit_boq'))) {
    return forbiddenResponse('edit_boq');
  }

  const project = await repos.projects.findById(wbsNode.projectId);

  if (!project) {
    return Response.json(
      {
        status: 'error',
        error: { code: 'NOT_FOUND', message: `Project ${wbsNode.projectId} not found` },
      },
      { status: 404 },
    );
  }

  if (isOutsourcedProject(project)) {
    return Response.json(
      {
        status: 'error',
        error: {
          code: 'FORBIDDEN',
          message: 'BOQ สำหรับโครงการจ้างภายนอกเป็นแบบอ่านอย่างเดียว',
        },
      },
      { status: 403 },
    );
  }

  const quantity = Number(body.quantity ?? 0);
  const unitPrice = Number(body.unitPrice ?? 0);

  const newItem: BOQItem = {
    id: `boq-${crypto.randomUUID().slice(0, 8)}`,
    wbsId: params.wbsId,
    description: body.description.trim(),
    quantity,
    unit: body.unit.trim(),
    unitPrice,
    total: quantity * unitPrice,
  };

  // Phase 2-B — capture the PERSISTED row (numeric columns may round
  // to 2 decimals on insert; the locally-constructed `newItem` would
  // otherwise carry a sub-cent value the DB doesn't store).
  const created = await repos.boq.create(newItem);
  await recordAuditEvent(request, {
    action: 'edit_boq',
    resourceType: 'boq',
    resourceId: created.id,
    projectId: wbsNode.projectId,
    before: null,
    after: created,
    decisionReason: 'create',
    authorityBasis: 'AUTHZ_MATRIX:edit_boq',
  });

  return Response.json({ status: 'success', data: created }, { status: 201 });
}

/** PR-C2 — PATCH a BOQ item. Total is server-derived. */
export async function PATCH(
  request: Request,
  { params }: { params: { wbsId: string } },
) {
  await new Promise((resolve) => setTimeout(resolve, 150));
  const repos = getRepositories();

  const rawBody: unknown = await request.json().catch(() => null);
  const parsed = parseRequestBody(updateBoqItemRequestSchema, rawBody);
  if (!parsed.success) return parsed.response;
  const body = parsed.data;

  const wbsNode = await repos.wbs.findById(params.wbsId);
  if (!wbsNode) {
    return Response.json(
      { status: 'error', error: { code: 'NOT_FOUND', message: `WBS ${params.wbsId} not found` } },
      { status: 404 },
    );
  }

  const forbidden = await requireProjectAccess(wbsNode.projectId);
  if (forbidden) return forbidden;

  const currentUser = await getCurrentApiUser();
  if (!(await canPerformProjectAction(currentUser, wbsNode.projectId, 'edit_boq'))) {
    return forbiddenResponse('edit_boq');
  }

  const project = await repos.projects.findById(wbsNode.projectId);
  if (project && isOutsourcedProject(project)) {
    return Response.json(
      {
        status: 'error',
        error: { code: 'FORBIDDEN', message: 'BOQ สำหรับโครงการจ้างภายนอกเป็นแบบอ่านอย่างเดียว' },
      },
      { status: 403 },
    );
  }

  const existing = await repos.boq.findById(body.id);
  if (!existing || existing.wbsId !== params.wbsId) {
    return Response.json(
      { status: 'error', error: { code: 'NOT_FOUND', message: 'BOQ item not found' } },
      { status: 404 },
    );
  }

  const before = { ...existing };
  const nextQuantity = body.quantity ?? existing.quantity;
  const nextUnitPrice = body.unitPrice ?? existing.unitPrice;
  const patch: Partial<BOQItem> = {
    description: body.description !== undefined ? body.description.trim() : existing.description,
    quantity: nextQuantity,
    unit: body.unit !== undefined ? body.unit.trim() : existing.unit,
    unitPrice: nextUnitPrice,
    total: nextQuantity * nextUnitPrice,
  };

  const updated = await repos.boq.update(body.id, patch);
  if (!updated) {
    return Response.json(
      { status: 'error', error: { code: 'NOT_FOUND', message: 'BOQ item not found' } },
      { status: 404 },
    );
  }

  await recordAuditEvent(request, {
    action: 'edit_boq',
    resourceType: 'boq',
    resourceId: updated.id,
    projectId: wbsNode.projectId,
    before,
    after: updated,
    decisionReason: 'update',
    authorityBasis: 'AUTHZ_MATRIX:edit_boq',
  });

  return Response.json({ status: 'success', data: updated });
}

/** PR-C2 — DELETE a BOQ item by id. */
export async function DELETE(
  request: Request,
  { params }: { params: { wbsId: string } },
) {
  await new Promise((resolve) => setTimeout(resolve, 150));
  const repos = getRepositories();

  const rawBody: unknown = await request.json().catch(() => null);
  const parsed = parseRequestBody(deleteBoqItemRequestSchema, rawBody);
  if (!parsed.success) return parsed.response;
  const { id } = parsed.data;

  const wbsNode = await repos.wbs.findById(params.wbsId);
  if (!wbsNode) {
    return Response.json(
      { status: 'error', error: { code: 'NOT_FOUND', message: `WBS ${params.wbsId} not found` } },
      { status: 404 },
    );
  }

  const forbidden = await requireProjectAccess(wbsNode.projectId);
  if (forbidden) return forbidden;

  const currentUser = await getCurrentApiUser();
  if (!(await canPerformProjectAction(currentUser, wbsNode.projectId, 'edit_boq'))) {
    return forbiddenResponse('edit_boq');
  }

  const project = await repos.projects.findById(wbsNode.projectId);
  if (project && isOutsourcedProject(project)) {
    return Response.json(
      {
        status: 'error',
        error: { code: 'FORBIDDEN', message: 'BOQ สำหรับโครงการจ้างภายนอกเป็นแบบอ่านอย่างเดียว' },
      },
      { status: 403 },
    );
  }

  const existing = await repos.boq.findById(id);
  if (!existing || existing.wbsId !== params.wbsId) {
    return Response.json(
      { status: 'error', error: { code: 'NOT_FOUND', message: 'BOQ item not found' } },
      { status: 404 },
    );
  }

  await repos.boq.delete(id);
  await recordAuditEvent(request, {
    action: 'edit_boq',
    resourceType: 'boq',
    resourceId: existing.id,
    projectId: wbsNode.projectId,
    before: existing,
    after: null,
    decisionReason: 'delete',
    authorityBasis: 'AUTHZ_MATRIX:edit_boq',
  });

  return Response.json({ status: 'success', data: existing });
}
