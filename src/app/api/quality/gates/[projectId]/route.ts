import { ensureProjectDemoStateHydrated } from '@/lib/project-demo-state';
import { getQualityGateStore } from '@/lib/quality-gate-store';
import { requireProjectAccess } from '@/lib/project-api-access';
import type { QualityGate } from '@/types/quality';

export async function GET(
  _request: Request,
  { params }: { params: { projectId: string } },
) {
  await new Promise((resolve) => setTimeout(resolve, 150));
  await ensureProjectDemoStateHydrated();
  const store: QualityGate[] = getQualityGateStore();
  const forbidden = requireProjectAccess(params.projectId);
  if (forbidden) return forbidden;

  const filtered = store.filter((g) => g.projectId === params.projectId);

  return Response.json({ status: 'success', data: filtered });
}
