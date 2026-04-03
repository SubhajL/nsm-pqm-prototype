import { canCreateProject } from '@/lib/auth';
import { requireProjectAccess, getCurrentApiUser } from '@/lib/project-api-access';
import { ensureProjectDemoStateHydrated, persistProjectDemoState } from '@/lib/project-demo-state';
import { getEvmStore } from '@/lib/evm-store';
import { getProjectStore } from '@/lib/project-store';
import type { EVMDataPoint } from '@/types/evm';
import { getProjectExecutionModel } from '@/types/project';

const store = getEvmStore();
const projectStore = getProjectStore();

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

  return Response.json({
    status: 'success',
    data: store.filter((point) => point.projectId === params.projectId),
  });
}

export async function POST(
  request: Request,
  { params }: { params: { projectId: string } },
) {
  await new Promise((resolve) => setTimeout(resolve, 150));
  await ensureProjectDemoStateHydrated();
  const forbidden = requireProjectAccess(params.projectId);
  if (forbidden) return forbidden;

  const currentUser = getCurrentApiUser();

  if (!currentUser || !canCreateProject(currentUser.role)) {
    return Response.json(
      {
        status: 'error',
        error: { code: 'FORBIDDEN', message: 'Only project managers or system admins can manage EVM data' },
      },
      { status: 403 },
    );
  }

  const body = (await request.json()) as Partial<EVMDataPoint>;
  const project = projectStore.find((entry) => entry.id === params.projectId);

  if (!project) {
    return Response.json(
      {
        status: 'error',
        error: { code: 'NOT_FOUND', message: 'Project not found' },
      },
      { status: 404 },
    );
  }

  const executionModel = getProjectExecutionModel(project);

  if (!body.month || body.pv === undefined || body.ev === undefined) {
    return Response.json(
      {
        status: 'error',
        error: { code: 'BAD_REQUEST', message: 'month, pv, and ev are required' },
      },
      { status: 400 },
    );
  }

  const month = body.month;
  const monthThai = body.monthThai ?? formatMonthThai(month);
  const pv = Number(body.pv);
  const ev = Number(body.ev);
  const rawAmount =
    executionModel === 'outsourced'
      ? body.paidToDate ?? body.ac ?? 0
      : body.ac;

  if (rawAmount === undefined) {
    return Response.json(
      {
        status: 'error',
        error: {
          code: 'BAD_REQUEST',
          message:
            executionModel === 'outsourced'
              ? 'month, pv, ev, and paidToDate are required for outsourced projects'
              : 'month, pv, ev, and ac are required for internal projects',
        },
      },
      { status: 400 },
    );
  }

  const ac = Number(rawAmount);

  const duplicate = store.find(
    (point) => point.projectId === params.projectId && point.month === month,
  );

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
    paidToDate: executionModel === 'outsourced' ? ac : undefined,
    spi: pv > 0 ? ev / pv : 0,
    cpi: ac > 0 ? ev / ac : 0,
  };

  store.push(newPoint);
  store.sort((a, b) => a.month.localeCompare(b.month));
  await persistProjectDemoState();

  return Response.json({ status: 'success', data: newPoint }, { status: 201 });
}

export async function DELETE(
  request: Request,
  { params }: { params: { projectId: string } },
) {
  await new Promise((resolve) => setTimeout(resolve, 150));
  await ensureProjectDemoStateHydrated();
  const forbidden = requireProjectAccess(params.projectId);
  if (forbidden) return forbidden;

  const currentUser = getCurrentApiUser();

  if (!currentUser || !canCreateProject(currentUser.role)) {
    return Response.json(
      {
        status: 'error',
        error: { code: 'FORBIDDEN', message: 'Only project managers or system admins can manage EVM data' },
      },
      { status: 403 },
    );
  }

  const body = (await request.json()) as { id?: string };

  if (!body.id) {
    return Response.json(
      {
        status: 'error',
        error: { code: 'BAD_REQUEST', message: 'id is required' },
      },
      { status: 400 },
    );
  }

  const index = store.findIndex(
    (point) => point.id === body.id && point.projectId === params.projectId,
  );

  if (index === -1) {
    return Response.json(
      {
        status: 'error',
        error: { code: 'NOT_FOUND', message: 'EVM snapshot not found' },
      },
      { status: 404 },
    );
  }

  const [deleted] = store.splice(index, 1);
  await persistProjectDemoState();

  return Response.json({ status: 'success', data: { id: deleted.id } });
}
