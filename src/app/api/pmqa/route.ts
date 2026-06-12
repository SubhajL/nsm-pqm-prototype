export const dynamic = 'force-dynamic';

import { getCurrentApiUser } from '@/lib/project-api-access';
import { rollupAllCategories } from '@/lib/pmqa/pmqa-rollup';
import { getVisibleProjectsForUser } from '@/lib/project-access';
import { getRepositories } from '@/lib/repositories';

/**
 * GET /api/pmqa
 *
 * Read-only: computes the rolled-up `PmqaScore` for the projects visible
 * to the current user (mirrors the `/api/projects` visibility pattern).
 *
 * Query parameters:
 *   - `projectId` (optional): scope the roll-up to a single project. The
 *     project must be in the caller's visible set or the response is 403.
 */
export async function GET(request: Request) {
  await new Promise((resolve) => setTimeout(resolve, 100));
  const currentUser = await getCurrentApiUser();

  if (!currentUser) {
    return Response.json(
      { status: 'error', error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
      { status: 401 },
    );
  }

  const repos = getRepositories();
  const allProjects = await repos.projects.list();
  const visibleProjects = await getVisibleProjectsForUser(currentUser, allProjects);

  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get('projectId');

  if (projectId && !visibleProjects.some((p) => p.id === projectId)) {
    return Response.json(
      {
        status: 'error',
        error: { code: 'FORBIDDEN', message: `Project ${projectId} is not accessible` },
      },
      { status: 403 },
    );
  }

  // Quality + inspection data are pulled in full. We could prefilter when
  // `projectId` is provided, but the lists are small (< low thousands of
  // rows in the prototype) and `rollupAllCategories` re-filters via its
  // `scopedSubset` helper, keeping the math identical regardless of which
  // side does the filtering.
  const [qualityGates, inspectionsData] = await Promise.all([
    repos.qualityGates.list(),
    repos.qualityInspections.getData(),
  ]);

  const visibleIds = new Set(visibleProjects.map((p) => p.id));
  const scopedGates = qualityGates.filter((g) => visibleIds.has(g.projectId));
  const scopedItps = inspectionsData.itpItems.filter((it) => visibleIds.has(it.projectId));
  const scopedInspections = inspectionsData.inspectionRecords.filter((ins) =>
    visibleIds.has(ins.projectId),
  );

  const score = rollupAllCategories({
    projects: visibleProjects,
    qualityGates: scopedGates,
    itpItems: scopedItps,
    inspections: scopedInspections,
    scope: projectId ? 'project' : 'portfolio',
    scopeId: projectId ?? undefined,
  });

  return Response.json({ status: 'success', data: score });
}
