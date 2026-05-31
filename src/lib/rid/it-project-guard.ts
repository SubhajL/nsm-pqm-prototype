/**
 * PR-30a — IT-only feature guard.
 *
 * The vendor-SOW / sprint / DT6 surfaces are scoped to IT-class projects.
 * Routes call `requireItProject(projectId)` to load the project AND gate
 * on `projectClass === 'it'`. The helper returns either a `Response`
 * (404 / 422) that the route must return as-is, OR the loaded `Project`
 * for the success path.
 *
 * Envelope shapes match the Wave 2 sibling conventions:
 *   - 404 NOT_FOUND when the project id is unknown.
 *   - 422 IT_ONLY_FEATURE when the project exists but isn't IT-class.
 */

import { getRepositories } from '@/lib/repositories';
import type { Project } from '@/types/project';

export type ItProjectGuardResult =
  | { ok: true; project: Project }
  | { ok: false; response: Response };

export async function requireItProject(
  projectId: string,
): Promise<ItProjectGuardResult> {
  const project = await getRepositories().projects.findById(projectId);
  if (!project) {
    return {
      ok: false,
      response: Response.json(
        {
          status: 'error',
          error: {
            code: 'NOT_FOUND',
            message: `Project ${projectId} not found`,
          },
        },
        { status: 404 },
      ),
    };
  }

  if (project.projectClass !== 'it') {
    return {
      ok: false,
      response: Response.json(
        {
          status: 'error',
          error: {
            code: 'IT_ONLY_FEATURE',
            message: `This feature is only available on IT-class projects (got "${project.projectClass}").`,
            projectClass: project.projectClass,
          },
        },
        { status: 422 },
      ),
    };
  }

  return { ok: true, project };
}
