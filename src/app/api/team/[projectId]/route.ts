import { requiresProjectDuty } from '@/lib/auth';
import { recordAuditEvent } from '@/lib/audit-helpers';
import {
  canPerformProjectAction,
  forbiddenResponse,
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
import { ensureProjectDemoStateHydrated, persistProjectDemoState } from '@/lib/project-demo-state';
import { getProjectStore } from '@/lib/project-store';
import { getUserStore } from '@/lib/user-store';
import { parseRequestBody } from '@/lib/validation';
import type { ProjectTeamMember } from '@/types/team';
import {
  inviteTeamMemberRequestSchema,
  removeTeamMemberRequestSchema,
} from '@/types/team.schema';

function badRequestResponse(code: string, message: string) {
  return Response.json(
    { status: 'error', error: { code, message } },
    { status: 400 },
  );
}

function canManageProjectTeam(projectId: string) {
  return canPerformProjectAction(getCurrentApiUser(), projectId, 'manage_team');
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
  await ensureProjectDemoStateHydrated();

  const denied = requireProjectAccess(params.projectId);
  if (denied) {
    return denied;
  }

  const searchParams = new URL(request.url).searchParams;

  if (searchParams.get('mode') === 'candidates') {
    if (!canManageProjectTeam(params.projectId)) {
      return forbiddenResponse('manage_team');
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
  await ensureProjectDemoStateHydrated();
  const rawBody: unknown = await request.json().catch(() => null);
  const parsed = parseRequestBody(inviteTeamMemberRequestSchema, rawBody);
  if (!parsed.success) return parsed.response;
  const body = parsed.data;

  const denied = requireProjectAccess(params.projectId);
  if (denied) {
    return denied;
  }

  if (!canManageProjectTeam(params.projectId)) {
    return forbiddenResponse('manage_team');
  }

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

  const membership = {
    projectId: params.projectId,
    userId: user.id,
    assignmentRole: getAssignmentRoleForUserRole(user.role),
  };
  addProjectMembership(membership);
  await persistProjectDemoState();

  await recordAuditEvent(request, {
    action: 'manage_team',
    resourceType: 'project_membership',
    resourceId: `${params.projectId}:${user.id}`,
    projectId: params.projectId,
    before: null,
    after: membership,
    decisionReason: `invite ${user.name} as ${membership.assignmentRole}`,
    authorityBasis: 'AUTHZ_MATRIX:manage_team',
  });

  return Response.json({ status: 'success', data: { userId: user.id } });
}

export async function DELETE(
  request: Request,
  { params }: { params: { projectId: string } },
) {
  await new Promise((resolve) => setTimeout(resolve, 150));
  await ensureProjectDemoStateHydrated();
  const rawBody: unknown = await request.json().catch(() => null);
  const parsed = parseRequestBody(removeTeamMemberRequestSchema, rawBody);
  if (!parsed.success) return parsed.response;
  const body = parsed.data;

  const denied = requireProjectAccess(params.projectId);
  if (denied) {
    return denied;
  }

  if (!canManageProjectTeam(params.projectId)) {
    return forbiddenResponse('manage_team');
  }

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

  const beforeMembership = getProjectMembershipStore().find(
    (membership) => membership.projectId === params.projectId && membership.userId === user.id,
  );
  const removed = removeProjectMembership(params.projectId, user.id);

  if (!removed) {
    return badRequestResponse('TEAM_MEMBER_NOT_FOUND', 'ผู้ใช้นี้ไม่ได้อยู่ในทีมโครงการ');
  }
  await persistProjectDemoState();

  await recordAuditEvent(request, {
    action: 'manage_team',
    resourceType: 'project_membership',
    resourceId: `${params.projectId}:${user.id}`,
    projectId: params.projectId,
    before: beforeMembership ?? null,
    after: null,
    decisionReason: `remove ${user.name}`,
    authorityBasis: 'AUTHZ_MATRIX:manage_team',
  });

  return Response.json({
    status: 'success',
    data: {
      userId: user.id,
      remainingAssignedProjects: getAssignedProjectCountForUser(user, getProjectStore()),
    },
  });
}
