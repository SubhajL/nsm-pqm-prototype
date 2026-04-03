import { cookies } from 'next/headers';
import { AUTH_COOKIE_USER_ID } from '@/lib/auth';
import { canCreateProject as canCreateProjectForRole } from '@/lib/auth';
import {
  getActiveUser,
  getAssignmentRoleForUserRole,
  getVisibleProjectsForUser,
} from '@/lib/project-access';
import { bootstrapProjectData, type NewProjectMilestoneInput } from '@/lib/project-bootstrap';
import { ensureProjectDemoStateHydrated, persistProjectDemoState } from '@/lib/project-demo-state';
import { syncProjectExecutionState } from '@/lib/project-execution-sync';
import { getProjectMembershipStore } from '@/lib/project-membership-store';
import { getProjectStore } from '@/lib/project-store';
import type { Project } from '@/types/project';

export async function GET(request: Request) {
  await new Promise((resolve) => setTimeout(resolve, 150));
  await ensureProjectDemoStateHydrated();
  const store = getProjectStore();
  const currentUser = getActiveUser(cookies().get(AUTH_COOKIE_USER_ID)?.value);

  const { searchParams } = new URL(request.url);
  const search = searchParams.get('search')?.toLowerCase();
  const status = searchParams.get('status');
  const type = searchParams.get('type');

  let filtered = getVisibleProjectsForUser(currentUser, store);
  filtered.forEach((project) => syncProjectExecutionState(project.id));

  if (search) {
    filtered = filtered.filter(
      (p) =>
        p.name.toLowerCase().includes(search) ||
        p.nameEn.toLowerCase().includes(search) ||
        p.code.toLowerCase().includes(search),
    );
  }

  if (status) {
    filtered = filtered.filter((p) => p.status === status);
  }

  if (type) {
    filtered = filtered.filter((p) => p.type === type);
  }

  return Response.json({ status: 'success', data: filtered });
}

export async function POST(request: Request) {
  await new Promise((resolve) => setTimeout(resolve, 150));
  await ensureProjectDemoStateHydrated();
  const store = getProjectStore();
  const membershipStore = getProjectMembershipStore();
  const currentUser = getActiveUser(cookies().get(AUTH_COOKIE_USER_ID)?.value);

  if (!currentUser || !canCreateProjectForRole(currentUser.role)) {
    return Response.json(
      {
        status: 'error',
        error: {
          code: 'FORBIDDEN',
          message: 'Only project managers or system admins can create new projects',
        },
      },
      { status: 403 },
    );
  }

  const body = (await request.json()) as Partial<Project> & {
    milestones?: NewProjectMilestoneInput[];
  };
  const { milestones = [], ...projectFields } = body;

  if (
    !projectFields.name ||
    !projectFields.type ||
    !projectFields.startDate ||
    !projectFields.endDate ||
    projectFields.budget === undefined ||
    !projectFields.managerId ||
    !projectFields.managerName ||
    !projectFields.departmentId ||
    !projectFields.departmentName ||
    projectFields.duration === undefined
  ) {
    return Response.json(
      {
        status: 'error',
        error: {
          code: 'BAD_REQUEST',
          message: 'Missing required project fields for creation',
        },
      },
      { status: 400 },
    );
  }

  const newProject: Project = {
    id: crypto.randomUUID(),
    code: `PJ-2569-${String(store.length + 1).padStart(4, '0')}`,
    name: projectFields.name,
    nameEn: projectFields.nameEn ?? projectFields.name,
    type: projectFields.type,
    executionModel: projectFields.executionModel ?? 'internal',
    status: projectFields.status ?? 'planning',
    budget: projectFields.budget,
    progress: projectFields.progress ?? 0,
    startDate: projectFields.startDate,
    endDate: projectFields.endDate,
    duration: projectFields.duration,
    spiValue: projectFields.spiValue ?? 0,
    cpiValue: projectFields.cpiValue ?? 0,
    scheduleHealth: projectFields.scheduleHealth ?? 'on_schedule',
    managerId: projectFields.managerId,
    managerName: projectFields.managerName,
    departmentId: projectFields.departmentId,
    departmentName: projectFields.departmentName,
    openIssues: projectFields.openIssues ?? 0,
    highRisks: projectFields.highRisks ?? 0,
    currentMilestone: projectFields.currentMilestone ?? 0,
    totalMilestones: projectFields.totalMilestones ?? 0,
  };

  store.push(newProject);

  membershipStore.push({
    projectId: newProject.id,
    userId: currentUser.id,
    assignmentRole: getAssignmentRoleForUserRole(currentUser.role),
  });

  bootstrapProjectData({
    project: newProject,
    milestones,
  });
  await persistProjectDemoState();

  return Response.json({ status: 'success', data: newProject }, { status: 201 });
}
