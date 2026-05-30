export const dynamic = 'force-dynamic';

import { requiresProjectDuty } from '@/lib/auth';
import { getAssignedProjectCountForUser } from '@/lib/project-access';
import { getRepositories } from '@/lib/repositories';
import type { User } from '@/types/admin';

export interface LoginCandidate extends User {
  canLogin: boolean;
}

export async function GET() {
  await new Promise((resolve) => setTimeout(resolve, 120));
  const repos = getRepositories();
  const projects = await repos.projects.list();
  const users = (await repos.users.list()).filter((user) => user.status === 'active');
  const activeUsers = await Promise.all(
    users.map(async (user) => {
      const projectCount = await getAssignedProjectCountForUser(user, projects);

      return {
        ...user,
        projectCount,
        canLogin: !requiresProjectDuty(user.role) || projectCount > 0,
      };
    }),
  );
  activeUsers.sort((left, right) => left.name.localeCompare(right.name, 'th'));

  return Response.json({ status: 'success', data: activeUsers });
}
