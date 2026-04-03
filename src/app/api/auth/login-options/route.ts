import { requiresProjectDuty } from '@/lib/auth';
import { ensureProjectDemoStateHydrated } from '@/lib/project-demo-state';
import { getAssignedProjectCountForUser } from '@/lib/project-access';
import { getProjectStore } from '@/lib/project-store';
import { getUserStore } from '@/lib/user-store';
import type { User } from '@/types/admin';

export interface LoginCandidate extends User {
  canLogin: boolean;
}

export async function GET() {
  await new Promise((resolve) => setTimeout(resolve, 120));
  await ensureProjectDemoStateHydrated();

  const projects = getProjectStore();
  const activeUsers = getUserStore()
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
