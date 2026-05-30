export const dynamic = 'force-dynamic';

import { getDerivedMilestonesForProject } from '@/lib/project-milestone-derivations';
import { requireProjectAccess } from '@/lib/project-api-access';

export async function GET(
  _request: Request,
  { params }: { params: { projectId: string } },
) {
  await new Promise((resolve) => setTimeout(resolve, 150));
  const forbidden = await requireProjectAccess(params.projectId);
  if (forbidden) return forbidden;

  const filtered = await getDerivedMilestonesForProject(params.projectId);

  return Response.json({ status: 'success', data: filtered });
}
