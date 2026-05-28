import { recordAuditEvent } from '@/lib/audit-helpers';
import {
  canPerformProjectAction,
  forbiddenResponse,
  getCurrentApiUser,
  requireProjectAccess,
} from '@/lib/project-api-access';
import { ensureProjectDemoStateHydrated, persistProjectDemoState } from '@/lib/project-demo-state';
import { getRepositories } from '@/lib/repositories';
import { parseRequestBody } from '@/lib/validation';
import type { EVMDataPoint } from '@/types/evm';
import {
  createEvmDataPointRequestSchema,
  deleteEvmDataPointRequestSchema,
} from '@/types/evm.schema';
import { getProjectDeliveryMethod } from '@/types/project';

function formatMonthThai(month: string) {
  const thaiMonths = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
  const [year, monthPart] = month.split('-').map(Number);
  const index = Math.max(0, Math.min(11, (monthPart ?? 1) - 1));
  const shortYear = ((year ?? 2026) + 543) % 100;
  return `${thaiMonths[index]} ${shortYear}`;
}

export async function GET(
  _request: Request,
  { params }: { params: { projectId: string } },
) {
  await new Promise((resolve) => setTimeout(resolve, 150));
  await ensureProjectDemoStateHydrated();
  const forbidden = requireProjectAccess(params.projectId);
  if (forbidden) return forbidden;

  const data = await getRepositories().evm.listByProject(params.projectId);
  return Response.json({ status: 'success', data });
}

export async function POST(
  request: Request,
  { params }: { params: { projectId: string } },
) {
  await new Promise((resolve) => setTimeout(resolve, 150));
  await ensureProjectDemoStateHydrated();
  const repos = getRepositories();

  const rawBody: unknown = await request.json().catch(() => null);
  const parsed = parseRequestBody(createEvmDataPointRequestSchema, rawBody);
  if (!parsed.success) return parsed.response;
  const body = parsed.data;

  const forbidden = requireProjectAccess(params.projectId);
  if (forbidden) return forbidden;

  if (!canPerformProjectAction(getCurrentApiUser(), params.projectId, 'edit_evm')) {
    return forbiddenResponse('edit_evm');
  }

  const project = await repos.projects.findById(params.projectId);

  if (!project) {
    return Response.json(
      {
        status: 'error',
        error: { code: 'NOT_FOUND', message: 'Project not found' },
      },
      { status: 404 },
    );
  }

  const deliveryMethod = getProjectDeliveryMethod(project);
  // `consultant_supervised` is treated as `outsourced` for EVM payment
  // semantics in MVP — see `deriveEvmMetrics` and MVP plan PR-15.
  const isContractPayment =
    deliveryMethod === 'outsourced' || deliveryMethod === 'consultant_supervised';

  const month = body.month;
  const monthThai = body.monthThai ?? formatMonthThai(month);
  const pv = Number(body.pv);
  const ev = Number(body.ev);
  const rawAmount = isContractPayment
    ? body.paidToDate ?? body.ac ?? 0
    : body.ac;

  if (rawAmount === undefined) {
    return Response.json(
      {
        status: 'error',
        error: {
          code: 'BAD_REQUEST',
          message: isContractPayment
            ? 'month, pv, ev, and paidToDate are required for outsourced projects'
            : 'month, pv, ev, and ac are required for internal projects',
        },
      },
      { status: 400 },
    );
  }

  const ac = Number(rawAmount);

  const duplicate = await repos.evm.findByProjectAndMonth(params.projectId, month);

  if (duplicate) {
    return Response.json(
      {
        status: 'error',
        error: { code: 'DUPLICATE_MONTH', message: 'มีข้อมูลงวด EVM ของเดือนนี้แล้ว' },
      },
      { status: 400 },
    );
  }

  const newPoint: EVMDataPoint = {
    id: `evm-${crypto.randomUUID().slice(0, 8)}`,
    projectId: params.projectId,
    month,
    monthThai,
    pv,
    ev,
    ac,
    paidToDate: isContractPayment ? ac : undefined,
    spi: pv > 0 ? ev / pv : 0,
    cpi: ac > 0 ? ev / ac : 0,
  };

  await repos.evm.create(newPoint);
  await persistProjectDemoState();

  await recordAuditEvent(request, {
    action: 'edit_evm',
    resourceType: 'evm_data_point',
    resourceId: newPoint.id,
    projectId: params.projectId,
    before: null,
    after: newPoint,
    decisionReason: `create month ${newPoint.month}`,
    authorityBasis: 'AUTHZ_MATRIX:edit_evm',
  });

  return Response.json({ status: 'success', data: newPoint }, { status: 201 });
}

export async function DELETE(
  request: Request,
  { params }: { params: { projectId: string } },
) {
  await new Promise((resolve) => setTimeout(resolve, 150));
  await ensureProjectDemoStateHydrated();
  const repos = getRepositories();

  const rawBody: unknown = await request.json().catch(() => null);
  const parsed = parseRequestBody(deleteEvmDataPointRequestSchema, rawBody);
  if (!parsed.success) return parsed.response;
  const body = parsed.data;

  const forbidden = requireProjectAccess(params.projectId);
  if (forbidden) return forbidden;

  if (!canPerformProjectAction(getCurrentApiUser(), params.projectId, 'edit_evm')) {
    return forbiddenResponse('edit_evm');
  }

  const existing = await repos.evm.findById(body.id);

  if (!existing || existing.projectId !== params.projectId) {
    return Response.json(
      {
        status: 'error',
        error: { code: 'NOT_FOUND', message: 'EVM snapshot not found' },
      },
      { status: 404 },
    );
  }

  const deleted = await repos.evm.delete(body.id);
  if (!deleted) {
    return Response.json(
      {
        status: 'error',
        error: { code: 'NOT_FOUND', message: 'EVM snapshot not found' },
      },
      { status: 404 },
    );
  }
  await persistProjectDemoState();

  await recordAuditEvent(request, {
    action: 'edit_evm',
    resourceType: 'evm_data_point',
    resourceId: deleted.id,
    projectId: params.projectId,
    before: deleted,
    after: null,
    decisionReason: `delete month ${deleted.month}`,
    authorityBasis: 'AUTHZ_MATRIX:edit_evm',
  });

  return Response.json({ status: 'success', data: { id: deleted.id } });
}
