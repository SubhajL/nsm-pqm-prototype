import { requireProjectAccess } from '@/lib/project-api-access';
import { getBoqStore } from '@/lib/boq-store';
import { getProjectStore } from '@/lib/project-store';
import { getWbsStore } from '@/lib/wbs-store';
import { canAccessAdmin } from '@/lib/auth';
import { getCurrentApiUser } from '@/lib/project-api-access';
import { ensureProjectDemoStateHydrated, persistProjectDemoState } from '@/lib/project-demo-state';
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

const store = getBoqStore();
const projectStore = getProjectStore();
const wbsStore = getWbsStore();

export async function GET(
  _request: Request,
  { params }: { params: { wbsId: string } },
) {
  await new Promise((resolve) => setTimeout(resolve, 150));
  await ensureProjectDemoStateHydrated();
  const wbsNode = wbsStore.find((node) => node.id === params.wbsId);

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

  const filtered = store.filter((item) => item.wbsId === params.wbsId);

  return Response.json({ status: 'success', data: filtered });
}

export async function POST(
  request: Request,
  { params }: { params: { wbsId: string } },
) {
  await new Promise((resolve) => setTimeout(resolve, 150));
  await ensureProjectDemoStateHydrated();

  const wbsNode = wbsStore.find((node) => node.id === params.wbsId);

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

  if (!currentUser) {
    return Response.json(
      { status: 'error', error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
      { status: 401 },
    );
  }

  if (!canAccessAdmin(currentUser.role) && currentUser.role !== 'Project Manager') {
    return Response.json(
      {
        status: 'error',
        error: { code: 'FORBIDDEN', message: 'Only project managers can create BOQ items' },
      },
      { status: 403 },
    );
  }

  const project = projectStore.find((entry) => entry.id === wbsNode.projectId);

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

  const body = (await request.json()) as Partial<BOQItem>;

  if (!body.description?.trim() || !body.unit?.trim()) {
    return Response.json(
      {
        status: 'error',
        error: { code: 'BAD_REQUEST', message: 'description and unit are required' },
      },
      { status: 400 },
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

  store.push(newItem);
  await persistProjectDemoState();

  return Response.json({ status: 'success', data: newItem }, { status: 201 });
}
