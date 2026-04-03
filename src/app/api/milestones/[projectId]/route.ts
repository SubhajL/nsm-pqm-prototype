import { getDerivedMilestonesForProject } from '@/lib/project-milestone-derivations';
import { requireProjectAccess } from '@/lib/project-api-access';
import type { Milestone } from '@/types/project';

export async function GET(
  _request: Request,
  { params }: { params: { projectId: string } },
) {
  await new Promise((resolve) => setTimeout(resolve, 150));
  const forbidden = requireProjectAccess(params.projectId);
  if (forbidden) return forbidden;

  const filtered: Milestone[] = getDerivedMilestonesForProject(params.projectId);

  return Response.json({ status: 'success', data: filtered });
}
