export const dynamic = 'force-dynamic';

import { requiresProjectDuty } from '@/lib/auth';
import { recordAuditEvent } from '@/lib/audit-helpers';
import {
  canPerformProjectAction,
  forbiddenResponse,
  getCurrentApiUser,
  requireProjectAccess,
} from '@/lib/project-api-access';
import {
  getAssignedProjectCountForUser,
  getAssignmentRoleForUserRole,
} from '@/lib/project-access';
import { getRepositories } from '@/lib/repositories';
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

async function canManageProjectTeam(projectId: string) {
  return canPerformProjectAction(await getCurrentApiUser(), projectId, 'manage_team');
}

async function getInviteCandidates(projectId: string) {
  const repos = getRepositories();
  const projects = await repos.projects.list();
  const memberships = await repos.teamMemberships.listByProject(projectId);
  const memberIds = new Set(memberships.map((membership) => membership.userId));

  const filteredUsers = (await repos.users.list()).filter(
    (user) =>
      user.status === 'active' &&
      !memberIds.has(user.id) &&
      requiresProjectDuty(user.role) &&
      user.role !== 'Project Manager',
  );
  const augmented = await Promise.all(
    filteredUsers.map(async (user) => ({
      ...user,
      projectCount: await getAssignedProjectCountForUser(user, projects),
    })),
  );
  augmented.sort((left, right) => left.name.localeCompare(right.name, 'th'));
  return augmented;
}

export async function GET(
  request: Request,
  { params }: { params: { projectId: string } },
) {
  await new Promise((resolve) => setTimeout(resolve, 150));
  const denied = await requireProjectAccess(params.projectId);
  if (denied) {
    return denied;
  }

  const searchParams = new URL(request.url).searchParams;

  if (searchParams.get('mode') === 'candidates') {
    if (!(await canManageProjectTeam(params.projectId))) {
      return forbiddenResponse('manage_team');
    }

    return Response.json({ status: 'success', data: await getInviteCandidates(params.projectId) });
  }

  const repos = getRepositories();
  const memberships = await repos.teamMemberships.listByProject(params.projectId);
  const projects = await repos.projects.list();
  const userStore = await repos.users.list();

  const membersUnfiltered = await Promise.all(
    memberships.map(async (membership) => {
      const user = userStore.find((candidate) => candidate.id === membership.userId);
      if (!user) return null;

      return {
        ...user,
        projectCount: await getAssignedProjectCountForUser(user, projects),
        assignmentRole: membership.assignmentRole,
      };
    }),
  );
  const members: ProjectTeamMember[] = membersUnfiltered.filter(
    (member): member is ProjectTeamMember => member !== null,
  );

  return Response.json({ status: 'success', data: members });
}

export async function POST(
  request: Request,
  { params }: { params: { projectId: string } },
) {
  await new Promise((resolve) => setTimeout(resolve, 150));
  const rawBody: unknown = await request.json().catch(() => null);
  const parsed = parseRequestBody(inviteTeamMemberRequestSchema, rawBody);
  if (!parsed.success) return parsed.response;
  const body = parsed.data;

  const denied = await requireProjectAccess(params.projectId);
  if (denied) {
    return denied;
  }

  if (!(await canManageProjectTeam(params.projectId))) {
    return forbiddenResponse('manage_team');
  }

  const repos = getRepositories();
  const userStore = await repos.users.list();
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

  if (await repos.teamMemberships.has(params.projectId, user.id)) {
    return badRequestResponse('DUPLICATE_TEAM_MEMBER', 'ผู้ใช้นี้อยู่ในทีมโครงการแล้ว');
  }

  const membership = {
    projectId: params.projectId,
    userId: user.id,
    assignmentRole: getAssignmentRoleForUserRole(user.role),
  };
  await repos.teamMemberships.add(membership);
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
  const rawBody: unknown = await request.json().catch(() => null);
  const parsed = parseRequestBody(removeTeamMemberRequestSchema, rawBody);
  if (!parsed.success) return parsed.response;
  const body = parsed.data;

  const denied = await requireProjectAccess(params.projectId);
  if (denied) {
    return denied;
  }

  if (!(await canManageProjectTeam(params.projectId))) {
    return forbiddenResponse('manage_team');
  }

  const repos = getRepositories();
  const userStore = await repos.users.list();
  const user = userStore.find((candidate) => candidate.id === body.userId);

  if (!user) {
    return badRequestResponse('INVALID_TEAM_MEMBER', 'ไม่พบผู้ใช้งานที่ต้องการนำออก');
  }

  const project = await repos.projects.findById(params.projectId);

  if (project && project.managerId === user.id) {
    return badRequestResponse(
      'CANNOT_REMOVE_PROJECT_MANAGER',
      'ไม่สามารถนำผู้จัดการโครงการหลักออกจากทีมได้',
    );
  }

  const beforeMembership = await repos.teamMemberships.find(params.projectId, user.id);
  const removed = await repos.teamMemberships.remove(params.projectId, user.id);

  if (!removed) {
    return badRequestResponse('TEAM_MEMBER_NOT_FOUND', 'ผู้ใช้นี้ไม่ได้อยู่ในทีมโครงการ');
  }
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
      remainingAssignedProjects: await getAssignedProjectCountForUser(user, await repos.projects.list()),
    },
  });
}
