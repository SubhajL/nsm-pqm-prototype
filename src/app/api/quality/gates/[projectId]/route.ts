import { getRepositories } from '@/lib/repositories';
import { requireProjectAccess } from '@/lib/project-api-access';

export async function GET(
  _request: Request,
  { params }: { params: { projectId: string } },
) {
  await new Promise((resolve) => setTimeout(resolve, 150));
  const forbidden = requireProjectAccess(params.projectId);
  if (forbidden) return forbidden;

  const filtered = await getRepositories().qualityGates.listByProject(params.projectId);

  return Response.json({ status: 'success', data: filtered });
}
