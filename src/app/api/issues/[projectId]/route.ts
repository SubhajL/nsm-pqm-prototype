import { requireProjectAccess } from '@/lib/project-api-access';
import { ensureProjectDemoStateHydrated, persistProjectDemoState } from '@/lib/project-demo-state';
import { getIssueStore } from '@/lib/issue-store';
import type { Issue } from '@/types/risk';

const store = getIssueStore();

export async function GET(
  request: Request,
  { params }: { params: { projectId: string } },
) {
  await new Promise((resolve) => setTimeout(resolve, 150));
  await ensureProjectDemoStateHydrated();
  const forbidden = requireProjectAccess(params.projectId);
  if (forbidden) return forbidden;

  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');

  let filtered = store.filter((i) => i.projectId === params.projectId);

  if (status) {
    filtered = filtered.filter((i) => i.status === status);
  }

  return Response.json({ status: 'success', data: filtered });
}

export async function POST(
  request: Request,
  { params }: { params: { projectId: string } },
) {
  await new Promise((resolve) => setTimeout(resolve, 150));
  await ensureProjectDemoStateHydrated();
  const forbidden = requireProjectAccess(params.projectId);
  if (forbidden) return forbidden;

  const body = (await request.json()) as Partial<Issue>;

  if (!body.title?.trim() || !body.assignee?.trim()) {
    return Response.json(
      {
        status: 'error',
        error: { code: 'BAD_REQUEST', message: 'title and assignee are required' },
      },
      { status: 400 },
    );
  }

  const newIssue: Issue = {
    id: `ISS-${String(store.length + 1).padStart(3, '0')}`,
    projectId: params.projectId,
    title: body.title.trim(),
    severity: body.severity ?? 'medium',
    status: body.status ?? 'open',
    assignee: body.assignee.trim(),
    linkedWbs: body.linkedWbs?.trim() || '-',
    slaHours: Number(body.slaHours ?? 48),
    resolution: body.resolution?.trim(),
    progress: body.progress,
    tags: body.tags ?? [],
    createdAt: body.createdAt ?? new Date().toISOString().split('T')[0],
    closedAt: null,
  };

  store.push(newIssue);
  await persistProjectDemoState();

  return Response.json({ status: 'success', data: newIssue }, { status: 201 });
}

export async function PATCH(
  request: Request,
  { params }: { params: { projectId: string } },
) {
  await new Promise((resolve) => setTimeout(resolve, 150));
  await ensureProjectDemoStateHydrated();
  const forbidden = requireProjectAccess(params.projectId);
  if (forbidden) return forbidden;

  const body = await request.json();
  const { issueId, status: newStatus } = body as { issueId: string; status: string };

  const index = store.findIndex(
    (i) => i.id === issueId && i.projectId === params.projectId,
  );

  if (index === -1) {
    return Response.json(
      { status: 'error', error: { code: 'NOT_FOUND', message: 'Issue not found' } },
      { status: 404 },
    );
  }

  store[index] = {
    ...store[index],
    status: newStatus as Issue['status'],
    closedAt: newStatus === 'closed' ? new Date().toISOString().split('T')[0] : store[index].closedAt,
  };
  await persistProjectDemoState();

  return Response.json({ status: 'success', data: store[index] });
}
