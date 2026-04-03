import { requireProjectAccess } from '@/lib/project-api-access';
import { ensureProjectDemoStateHydrated, persistProjectDemoState } from '@/lib/project-demo-state';
import { getIssueStore } from '@/lib/issue-store';
import { getRiskStore } from '@/lib/risk-store';
import { synchronizeMitigatingRiskIssues } from '@/lib/risk-issue-consistency';
import type { Risk } from '@/types/risk';

const store = getRiskStore();
const issueStore = getIssueStore();

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

  let filtered = store.filter((r) => r.projectId === params.projectId);

  if (status) {
    filtered = filtered.filter((r) => r.status === status);
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

  const body = (await request.json()) as Partial<Risk>;

  if (!body.title?.trim() || !body.owner?.trim()) {
    return Response.json(
      {
        status: 'error',
        error: { code: 'BAD_REQUEST', message: 'title and owner are required' },
      },
      { status: 400 },
    );
  }

  const likelihood = Number(body.likelihood ?? 1);
  const impact = Number(body.impact ?? 1);
  const score = likelihood * impact;
  const level: Risk['level'] =
    score >= 16 ? 'critical' : score >= 10 ? 'high' : score >= 5 ? 'medium' : 'low';

  const newRisk: Risk = {
    id: `R-${String(store.length + 1).padStart(3, '0')}`,
    projectId: params.projectId,
    title: body.title.trim(),
    description: body.description?.trim() || '',
    likelihood,
    impact,
    score,
    level,
    status: body.status ?? 'open',
    owner: body.owner.trim(),
    dateIdentified: body.dateIdentified ?? new Date().toISOString().split('T')[0],
    mitigation: body.mitigation?.trim() || '',
  };

  store.push(newRisk);
  synchronizeMitigatingRiskIssues(issueStore, [newRisk]);
  await persistProjectDemoState();

  return Response.json({ status: 'success', data: newRisk }, { status: 201 });
}
