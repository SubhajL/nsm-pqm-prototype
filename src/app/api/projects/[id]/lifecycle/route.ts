import { recordAuditEvent } from '@/lib/audit-helpers';
import {
  canPerformProjectAction,
  forbiddenResponse,
  getCurrentApiUser,
} from '@/lib/project-api-access';
import { getRepositories } from '@/lib/repositories';
import { canEnterStage } from '@/lib/rid/lifecycle-artifacts';
import { parseRequestBody } from '@/lib/validation';
import { advanceLifecycleStageRequestSchema } from '@/types/project.schema';

/**
 * PATCH /api/projects/[id]/lifecycle — advance a project to the next RID
 * lifecycle stage (PR-16).
 *
 * Wire shape:
 *   request body: { targetStage: RidLifecycleStage; artifactDocIds: string[] }
 *   on success:   200 { status: 'success', data: Project }
 *   validation:   400 VALIDATION_FAILED
 *   auth:         401 UNAUTHORIZED / 403 FORBIDDEN
 *   not found:    404 NOT_FOUND
 *   gate blocked: 409 STAGE_GATE_BLOCKED with the list of missing artifacts
 *
 * Authz: requires the `advance_lifecycle_stage` action (System Admin or
 * Project Manager per AUTHZ_MATRIX). Visibility is composed by
 * `canPerformProjectAction()` as usual.
 *
 * On success the route:
 *   1. Mutates Project.currentLifecycleStage to `targetStage`
 *   2. Appends an entry to Project.lifecycleStageHistory (actor + ts +
 *      cited artifactDocIds)
 *   3. Persists via the projects repository (Database canonical post-PR-21)
 *   4. Emits an `advance_lifecycle_stage` audit event with before/after snapshot
 */
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } },
) {
  const rawBody: unknown = await request.json().catch(() => null);
  const parsed = parseRequestBody(advanceLifecycleStageRequestSchema, rawBody);
  if (!parsed.success) return parsed.response;

  const currentUser = getCurrentApiUser();

  if (!canPerformProjectAction(currentUser, params.id, 'advance_lifecycle_stage')) {
    return forbiddenResponse('advance_lifecycle_stage');
  }

  const repos = getRepositories();
  const project = await repos.projects.findById(params.id);

  if (!project) {
    return Response.json(
      {
        status: 'error',
        error: { code: 'NOT_FOUND', message: `Project ${params.id} not found` },
      },
      { status: 404 },
    );
  }

  const documents = (await repos.documents.getDataForProject(params.id)).files;
  const gateDecision = canEnterStage(
    parsed.data.targetStage,
    parsed.data.artifactDocIds,
    documents,
  );

  if (!gateDecision.ok) {
    return Response.json(
      {
        status: 'error',
        error: {
          code: 'STAGE_GATE_BLOCKED',
          message: `Cannot enter stage "${parsed.data.targetStage}" — required artifacts are missing`,
          targetStage: parsed.data.targetStage,
          missing: gateDecision.missing.map((req) => ({
            key: req.key,
            label: req.label,
            sopReference: req.sopReference,
          })),
        },
      },
      { status: 409 },
    );
  }

  const beforeSnapshot = {
    currentLifecycleStage: project.currentLifecycleStage,
    lifecycleStageHistory: [...project.lifecycleStageHistory],
  };

  project.currentLifecycleStage = parsed.data.targetStage;
  project.lifecycleStageHistory.push({
    stage: parsed.data.targetStage,
    enteredAt: new Date().toISOString(),
    enteredBy: currentUser?.id ?? null,
    artifactDocIds: [...parsed.data.artifactDocIds],
  });
  await recordAuditEvent(request, {
    action: 'advance_lifecycle_stage',
    resourceType: 'project',
    resourceId: project.id,
    projectId: project.id,
    before: beforeSnapshot,
    after: {
      currentLifecycleStage: project.currentLifecycleStage,
      lifecycleStageHistory: project.lifecycleStageHistory,
    },
    decisionReason: `lifecycle stage → ${parsed.data.targetStage}`,
    authorityBasis: 'AUTHZ_MATRIX:advance_lifecycle_stage',
    actor: currentUser,
  });

  return Response.json({ status: 'success', data: project });
}
