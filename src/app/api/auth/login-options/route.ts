import { requiresProjectDuty } from '@/lib/auth';
import { ensureProjectDemoStateHydrated } from '@/lib/project-demo-state';
import { getAssignedProjectCountForUser } from '@/lib/project-access';
import { getRepositories } from '@/lib/repositories';
import type { User } from '@/types/admin';

export interface LoginCandidate extends User {
  canLogin: boolean;
}

export async function GET() {
  await new Promise((resolve) => setTimeout(resolve, 120));
  await ensureProjectDemoStateHydrated();

  const repos = getRepositories();
  const projects = await repos.projects.list();
  const activeUsers = (await repos.users.list())
    .filter((user) => user.status === 'active')
    .map((user) => {
      const projectCount = getAssignedProjectCountForUser(user, projects);

      return {
        ...user,
        projectCount,
        canLogin: !requiresProjectDuty(user.role) || projectCount > 0,
      };
    })
    .sort((left, right) => left.name.localeCompare(right.name, 'th'));

  return Response.json({ status: 'success', data: activeUsers });
}
