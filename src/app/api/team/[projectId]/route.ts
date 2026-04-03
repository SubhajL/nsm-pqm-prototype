import { canAccessAdmin, requiresProjectDuty } from '@/lib/auth';
import {
  getCurrentApiUser,
  requireProjectAccess,
} from '@/lib/project-api-access';
import {
  addProjectMembership,
  getProjectMembershipStore,
  hasProjectMembership,
  removeProjectMembership,
} from '@/lib/project-membership-store';
import {
  getAssignedProjectCountForUser,
  getAssignmentRoleForUserRole,
} from '@/lib/project-access';
import { getProjectStore } from '@/lib/project-store';
import { getUserStore } from '@/lib/user-store';
import type { ProjectTeamMember } from '@/types/team';

function forbiddenManagementResponse() {
  return Response.json(
    {
      status: 'error',
      error: {
        code: 'FORBIDDEN',
        message: 'มีเฉพาะผู้ดูแลระบบหรือผู้จัดการโครงการเท่านั้นที่จัดการทีมได้',
      },
    },
    { status: 403 },
  );
}

function badRequestResponse(code: string, message: string) {
  return Response.json(
    { status: 'error', error: { code, message } },
    { status: 400 },
  );
}

function canManageProjectTeam() {
  const currentUser = getCurrentApiUser();

  if (!currentUser) {
    return false;
  }

  return canAccessAdmin(currentUser.role) || currentUser.role === 'Project Manager';
}

function getInviteCandidates(projectId: string) {
  const projects = getProjectStore();
  const memberIds = new Set(
    getProjectMembershipStore()
      .filter((membership) => membership.projectId === projectId)
      .map((membership) => membership.userId),
  );

  return getUserStore()
    .filter(
      (user) =>
        user.status === 'active' &&
        !memberIds.has(user.id) &&
        requiresProjectDuty(user.role) &&
        user.role !== 'Project Manager',
    )
    .map((user) => ({
      ...user,
      projectCount: getAssignedProjectCountForUser(user, projects),
    }))
    .sort((left, right) => left.name.localeCompare(right.name, 'th'));
}

export async function GET(
  request: Request,
  { params }: { params: { projectId: string } },
) {
  await new Promise((resolve) => setTimeout(resolve, 150));

  const denied = requireProjectAccess(params.projectId);
  if (denied) {
    return denied;
  }

  const searchParams = new URL(request.url).searchParams;

  if (searchParams.get('mode') === 'candidates') {
    if (!canManageProjectTeam()) {
      return forbiddenManagementResponse();
    }

    return Response.json({ status: 'success', data: getInviteCandidates(params.projectId) });
  }

  const memberships = getProjectMembershipStore().filter(
    (membership) => membership.projectId === params.projectId,
  );
  const projects = getProjectStore();
  const userStore = getUserStore();

  const members: ProjectTeamMember[] = memberships
    .map((membership) => {
      const user = userStore.find((candidate) => candidate.id === membership.userId);
      if (!user) {
        return null;
      }

      return {
        ...user,
        projectCount: getAssignedProjectCountForUser(user, projects),
        assignmentRole: membership.assignmentRole,
      };
    })
    .filter((member): member is ProjectTeamMember => member !== null);

  return Response.json({ status: 'success', data: members });
}

export async function POST(
  request: Request,
  { params }: { params: { projectId: string } },
) {
  await new Promise((resolve) => setTimeout(resolve, 150));

  const denied = requireProjectAccess(params.projectId);
  if (denied) {
    return denied;
  }

  if (!canManageProjectTeam()) {
    return forbiddenManagementResponse();
  }

  const body = (await request.json()) as { userId?: string };
  const userStore = getUserStore();
  const user = userStore.find(
    (candidate) => candidate.id === body.userId && candidate.status === 'active',
  );

  if (!user) {
    return badRequestResponse('INVALID_TEAM_MEMBER', 'ไม่พบผู้ใช้งานที่เชิญเข้าร่วมโครงการ');
  }

  if (!requiresProjectDuty(user.role) || user.role === 'Project Manager') {
    return badRequestResponse(
      'UNSUPPORTED_TEAM_ROLE',
      'เชิญได้เฉพาะ Engineer, Coordinator, Team Member หรือ Consultant',
    );
  }

  if (hasProjectMembership(params.projectId, user.id)) {
    return badRequestResponse('DUPLICATE_TEAM_MEMBER', 'ผู้ใช้นี้อยู่ในทีมโครงการแล้ว');
  }

  addProjectMembership({
    projectId: params.projectId,
    userId: user.id,
    assignmentRole: getAssignmentRoleForUserRole(user.role),
  });

  return Response.json({ status: 'success', data: { userId: user.id } });
}

export async function DELETE(
  request: Request,
  { params }: { params: { projectId: string } },
) {
  await new Promise((resolve) => setTimeout(resolve, 150));

  const denied = requireProjectAccess(params.projectId);
  if (denied) {
    return denied;
  }

  if (!canManageProjectTeam()) {
    return forbiddenManagementResponse();
  }

  const body = (await request.json()) as { userId?: string };
  const userStore = getUserStore();
  const user = userStore.find((candidate) => candidate.id === body.userId);

  if (!user) {
    return badRequestResponse('INVALID_TEAM_MEMBER', 'ไม่พบผู้ใช้งานที่ต้องการนำออก');
  }

  const project = getProjectStore().find((candidate) => candidate.id === params.projectId);

  if (project && project.managerId === user.id) {
    return badRequestResponse(
      'CANNOT_REMOVE_PROJECT_MANAGER',
      'ไม่สามารถนำผู้จัดการโครงการหลักออกจากทีมได้',
    );
  }

  const removed = removeProjectMembership(params.projectId, user.id);

  if (!removed) {
    return badRequestResponse('TEAM_MEMBER_NOT_FOUND', 'ผู้ใช้นี้ไม่ได้อยู่ในทีมโครงการ');
  }

  return Response.json({
    status: 'success',
    data: {
      userId: user.id,
      remainingAssignedProjects: getAssignedProjectCountForUser(user, getProjectStore()),
    },
  });
}
