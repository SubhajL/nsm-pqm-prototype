import { cookies } from 'next/headers';
import { AUTH_COOKIE_USER_ID } from '@/lib/auth';
import { AUTHZ_MATRIX } from '@/lib/authz-matrix';
import { recordAuditEvent } from '@/lib/audit-helpers';
import { forbiddenResponse } from '@/lib/project-api-access';
import {
  getActiveUser,
  getAssignmentRoleForUserRole,
  getVisibleProjectsForUser,
} from '@/lib/project-access';
import { bootstrapProjectData, inferProjectSizeTier } from '@/lib/project-bootstrap';
import { syncProjectExecutionState } from '@/lib/project-execution-sync';
import { getRepositories } from '@/lib/repositories';
import { parseRequestBody } from '@/lib/validation';
import type { Project } from '@/types/project';
import { createProjectRequestSchema } from '@/types/project.schema';

export async function GET(request: Request) {
  await new Promise((resolve) => setTimeout(resolve, 150));
  const repos = getRepositories();
  const store = await repos.projects.list();
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
  const rawBody: unknown = await request.json().catch(() => null);
  const parsed = parseRequestBody(createProjectRequestSchema, rawBody);
  if (!parsed.success) return parsed.response;
  const { milestones = [], ...projectFields } = parsed.data;
  // Detect whether the caller explicitly supplied `sizeTier`; the schema
  // defaults to 'medium' when omitted, so without this check we cannot tell
  // an admin override apart from "use the default" and would always overwrite
  // with the budget-derived tier.
  const sizeTierExplicitlySet =
    typeof rawBody === 'object' &&
    rawBody !== null &&
    'sizeTier' in (rawBody as Record<string, unknown>);

  const repos = getRepositories();
  const store = await repos.projects.list();
  const currentUser = getActiveUser(cookies().get(AUTH_COOKIE_USER_ID)?.value);

  // create_project does not target an existing project, so we skip
  // canPerformProjectAction (which composes a per-project visibility check)
  // and consult the matrix directly. Visibility-scoped actions on the new
  // project ID will start applying once the row exists.
  if (!currentUser || !AUTHZ_MATRIX[currentUser.role].has('create_project')) {
    return forbiddenResponse('create_project');
  }

  const newProject: Project = {
    id: crypto.randomUUID(),
    code: `PJ-2569-${String(store.length + 1).padStart(4, '0')}`,
    name: projectFields.name,
    nameEn: projectFields.nameEn ?? projectFields.name,
    type: projectFields.type,
    deliveryMethod: projectFields.deliveryMethod ?? 'in_house',
    contractingModel: projectFields.contractingModel ?? null,
    // sizeTier: when the caller did not explicitly supply it, infer from
    // budget via PR-13's classifier so the tier reflects the project's actual
    // scale. An explicit caller-supplied value (admin override path) is
    // always respected, even if it disagrees with the budget classification.
    sizeTier: sizeTierExplicitlySet
      ? projectFields.sizeTier
      : inferProjectSizeTier(projectFields.budget),
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
    // PR-16: every project starts in the 'planning' lifecycle stage with a
    // single auto-seeded history entry (no actor; entry time = creation).
    currentLifecycleStage: 'planning',
    lifecycleStageHistory: [
      {
        stage: 'planning',
        enteredAt: new Date().toISOString(),
        enteredBy: null,
        artifactDocIds: [],
      },
    ],
  };

  await repos.projects.create(newProject);

  await repos.teamMemberships.add({
    projectId: newProject.id,
    userId: currentUser.id,
    assignmentRole: getAssignmentRoleForUserRole(currentUser.role),
  });

  bootstrapProjectData({
    project: newProject,
    milestones,
  });
  await recordAuditEvent(request, {
    action: 'create_project',
    resourceType: 'project',
    resourceId: newProject.id,
    projectId: newProject.id,
    before: null,
    after: newProject,
    authorityBasis: 'AUTHZ_MATRIX:create_project',
    actor: currentUser,
  });

  return Response.json({ status: 'success', data: newProject }, { status: 201 });
}
