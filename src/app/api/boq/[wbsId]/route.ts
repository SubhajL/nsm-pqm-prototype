import { recordAuditEvent } from '@/lib/audit-helpers';
import {
  canPerformProjectAction,
  forbiddenResponse,
  getCurrentApiUser,
  requireProjectAccess,
} from '@/lib/project-api-access';
import { getRepositories } from '@/lib/repositories';
import { ensureProjectDemoStateHydrated, persistProjectDemoState } from '@/lib/project-demo-state';
import { parseRequestBody } from '@/lib/validation';
import { createBoqItemRequestSchema } from '@/types/boq.schema';
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
  await ensureProjectDemoStateHydrated();
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

  const forbidden = requireProjectAccess(wbsNode.projectId);
  if (forbidden) return forbidden;

  const filtered = await repos.boq.listByWbs(params.wbsId);

  return Response.json({ status: 'success', data: filtered });
}

export async function POST(
  request: Request,
  { params }: { params: { wbsId: string } },
) {
  await new Promise((resolve) => setTimeout(resolve, 150));
  await ensureProjectDemoStateHydrated();
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

  const forbidden = requireProjectAccess(wbsNode.projectId);
  if (forbidden) return forbidden;

  const currentUser = getCurrentApiUser();

  if (!canPerformProjectAction(currentUser, wbsNode.projectId, 'edit_boq')) {
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

  await repos.boq.create(newItem);
  await persistProjectDemoState();

  await recordAuditEvent(request, {
    action: 'edit_boq',
    resourceType: 'boq',
    resourceId: newItem.id,
    projectId: wbsNode.projectId,
    before: null,
    after: newItem,
    decisionReason: 'create',
    authorityBasis: 'AUTHZ_MATRIX:edit_boq',
  });

  return Response.json({ status: 'success', data: newItem }, { status: 201 });
}
