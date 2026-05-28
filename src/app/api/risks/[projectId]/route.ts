import { recordAuditEvent } from '@/lib/audit-helpers';
import {
  canPerformProjectAction,
  forbiddenResponse,
  getCurrentApiUser,
  requireProjectAccess,
} from '@/lib/project-api-access';
import { ensureProjectDemoStateHydrated, persistProjectDemoState } from '@/lib/project-demo-state';
import { getRepositories } from '@/lib/repositories';
import { synchronizeMitigatingRiskIssues } from '@/lib/risk-issue-consistency';
import { parseRequestBody } from '@/lib/validation';
import type { Risk } from '@/types/risk';
import { createRiskRequestSchema } from '@/types/risk.schema';

export async function GET(
  request: Request,
  { params }: { params: { projectId: string } },
) {
  await new Promise((resolve) => setTimeout(resolve, 150));
  await ensureProjectDemoStateHydrated();
  const store = await getRepositories().risks.list();
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
  const repos = getRepositories();
  const store = await repos.risks.list();
  const issueStore = await repos.issues.list();

  const rawBody: unknown = await request.json().catch(() => null);
  const parsed = parseRequestBody(createRiskRequestSchema, rawBody);
  if (!parsed.success) return parsed.response;
  const body = parsed.data;

  const forbidden = requireProjectAccess(params.projectId);
  if (forbidden) return forbidden;

  if (!canPerformProjectAction(getCurrentApiUser(), params.projectId, 'edit_risk')) {
    return forbiddenResponse('edit_risk');
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

  await repos.risks.create(newRisk);
  synchronizeMitigatingRiskIssues(issueStore, [newRisk]);
  await persistProjectDemoState();

  await recordAuditEvent(request, {
    action: 'edit_risk',
    resourceType: 'risk',
    resourceId: newRisk.id,
    projectId: params.projectId,
    before: null,
    after: newRisk,
    decisionReason: `create (level=${newRisk.level}, score=${newRisk.score})`,
    authorityBasis: 'AUTHZ_MATRIX:edit_risk',
  });

  return Response.json({ status: 'success', data: newRisk }, { status: 201 });
}
