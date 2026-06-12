/**
 * PR-35 — Route factory for register-style API endpoints.
 *
 * ~85% of the hand-written handlers under `src/app/api` were the same
 * pipeline: feature-flag gate → Zod parse → (parent resolution) →
 * project visibility → action authz → (IT-class guard) → repo write →
 * audit → `{ status: 'success', data }` envelope. The three creators
 * here generate `{ GET, POST }` exports so a route file collapses to a
 * config object. Anything that does not fit the pipeline (evidence
 * checks, completeness gates, derived warranty windows, sibling-entity
 * lookups) stays a hand-written route — do NOT grow this factory hooks
 * for one-off branching; fork back to a custom handler instead.
 *
 * Gate order is part of the API contract (locked by the existing route
 * tests, which keep passing against factory-built handlers):
 *   1. feature flag           → 503 FEATURE_DISABLED (before auth)
 *   2. request body Zod parse → 400 VALIDATION_FAILED  (POST only)
 *   3. parent lookup          → 404 NOT_FOUND          (child routes)
 *   4. project visibility     → 401/403
 *   5. action authz           → 403 FORBIDDEN
 *   6. IT-class guard         → 422 IT_ONLY_FEATURE
 *   7. write → audit → 201
 */
import { recordAuditEvent, withTransactionalAudit } from '@/lib/audit-helpers';
import {
  featureDisabledResponse,
  isFeatureEnabled,
  type KnownFeatureFlag,
} from '@/lib/feature-flags';
import {
  canPerformProjectAction,
  forbiddenResponse,
  getCurrentApiUser,
  requireProjectAccess,
} from '@/lib/project-api-access';
import { requireItProject } from '@/lib/rid/it-project-guard';
import type { Project as ItProject } from '@/types/project';
import { getRepositories, type RepositoryRegistry } from '@/lib/repositories';
import { STATE_CONFLICT, stateConflictResponse } from '@/lib/state-conflict';
import { parseRequestBody } from '@/lib/validation';
import type { Action } from '@/lib/authz-matrix';
import type { User } from '@/types/admin';
import type { ZodType } from 'zod';

/** Loose param shape — concrete routes narrow via their directory name. */
type RouteContext = { params: Record<string, string> };

export interface CreateContext {
  projectId: string;
  /** The acting user — the action-authz gate guarantees non-null. */
  currentUser: User;
  /** The IT-class project, present when `requireIt` is set. */
  itProject?: ItProject;
}

interface RegisterAuditConfig<TEntity> {
  action: string;
  resourceType: string;
  decisionReason: (created: TEntity) => string;
}

interface RegisterCommonConfig<TEntity extends { id: string }, TCreate> {
  /** 503 gate evaluated BEFORE everything else. */
  featureFlag?: KnownFeatureFlag;
  /** 422 IT_ONLY_FEATURE gate after authz, before the write. */
  requireIt?: boolean;
  /** Action-level authz for POST. Default `edit_basic`. */
  action?: Action;
  createSchema: ZodType<TCreate>;
  list: (repos: RepositoryRegistry, scopeId: string) => Promise<TEntity[]>;
  /**
   * Default create path: `create(repos, build(body, ctx))`. Routes with
   * server-assigned sequences override `performCreate` instead (e.g. the
   * TOR retry loop) and may return a ready error Response.
   */
  build?: (body: TCreate, ctx: CreateContext) => TEntity;
  create?: (repos: RepositoryRegistry, entity: TEntity) => Promise<TEntity>;
  performCreate?: (
    repos: RepositoryRegistry,
    body: TCreate,
    ctx: CreateContext,
  ) => Promise<TEntity | Response>;
  /**
   * Run create + audit inside one `withTransactionalAudit` transaction
   * (gov't-audit atomicity). Incompatible with `performCreate`.
   */
  transactionalCreate?: boolean;
  audit: RegisterAuditConfig<TEntity>;
}

function notFoundResponse(message: string): Response {
  return Response.json(
    { status: 'error', error: { code: 'NOT_FOUND', message } },
    { status: 404 },
  );
}

async function runCreatePipeline<TEntity extends { id: string }, TCreate>(
  request: Request,
  projectId: string,
  cfg: RegisterCommonConfig<TEntity, TCreate>,
  body: TCreate,
): Promise<Response> {
  const forbidden = await requireProjectAccess(projectId);
  if (forbidden) return forbidden;

  const action = cfg.action ?? 'edit_basic';
  const currentUser = await getCurrentApiUser();
  if (
    !currentUser ||
    !(await canPerformProjectAction(currentUser, projectId, action))
  ) {
    return forbiddenResponse(action);
  }

  const ctx: CreateContext = { projectId, currentUser };
  if (cfg.requireIt) {
    const guard = await requireItProject(projectId);
    if (!guard.ok) return guard.response;
    ctx.itProject = guard.project;
  }

  const repos = getRepositories();
  const auditInput = (created: TEntity) => ({
    action: cfg.audit.action,
    resourceType: cfg.audit.resourceType,
    resourceId: created.id,
    projectId,
    before: null,
    after: created,
    decisionReason: cfg.audit.decisionReason(created),
    authorityBasis: `AUTHZ_MATRIX:${action}`,
    actor: currentUser,
  });

  if (cfg.transactionalCreate) {
    if (!cfg.build || !cfg.create) {
      throw new Error('route-factory: transactionalCreate needs build+create');
    }
    const entity = cfg.build(body, ctx);
    const created = await withTransactionalAudit(
      request,
      async (txRepos, appendAudit) => {
        const result = await cfg.create!(txRepos, entity);
        await appendAudit(auditInput(result));
        return result;
      },
    );
    return Response.json({ status: 'success', data: created }, { status: 201 });
  }

  let created: TEntity;
  if (cfg.performCreate) {
    const result = await cfg.performCreate(repos, body, ctx);
    if (result instanceof Response) return result;
    created = result;
  } else {
    if (!cfg.build || !cfg.create) {
      throw new Error('route-factory: provide build+create or performCreate');
    }
    created = await cfg.create(repos, cfg.build(body, ctx));
  }

  await recordAuditEvent(request, auditInput(created));

  return Response.json({ status: 'success', data: created }, { status: 201 });
}

/**
 * GET/POST `/api/<entity>/by-project/[projectId]` — list + create scoped
 * directly to a project.
 */
export function createByProjectRegisterRoutes<TEntity extends { id: string }, TCreate>(
  cfg: RegisterCommonConfig<TEntity, TCreate> & {
    /** Route param holding the project id. Default `projectId`. */
    paramName?: string;
  },
) {
  const paramName = cfg.paramName ?? 'projectId';

  async function GET(_request: Request, { params }: RouteContext) {
    if (cfg.featureFlag && !isFeatureEnabled(cfg.featureFlag)) {
      return featureDisabledResponse(cfg.featureFlag);
    }
    const projectId = params[paramName];

    const forbidden = await requireProjectAccess(projectId);
    if (forbidden) return forbidden;

    if (cfg.requireIt) {
      const guard = await requireItProject(projectId);
      if (!guard.ok) return guard.response;
    }

    const list = await cfg.list(getRepositories(), projectId);
    return Response.json({ status: 'success', data: list });
  }

  async function POST(request: Request, { params }: RouteContext) {
    if (cfg.featureFlag && !isFeatureEnabled(cfg.featureFlag)) {
      return featureDisabledResponse(cfg.featureFlag);
    }
    const rawBody: unknown = await request.json().catch(() => null);
    const parsed = parseRequestBody(cfg.createSchema, rawBody);
    if (!parsed.success) return parsed.response;

    return runCreatePipeline(request, params[paramName], cfg, parsed.data);
  }

  return { GET, POST };
}

/**
 * GET/POST `/api/<entity>/[parentId]` — list + create scoped to a parent
 * entity (package, work period, packet, …) that resolves to a project
 * for the access checks. The parent object is handed to `build` and the
 * audit `decisionReason` so messages can reference parent context
 * (e.g. งวดที่ N).
 */
export function createChildRegisterRoutes<
  TEntity extends { id: string },
  TCreate,
  TParent extends { projectId: string },
>(cfg: {
  featureFlag?: KnownFeatureFlag;
  /** Action-level authz for POST. Default `edit_basic`. */
  action?: Action;
  /** Route param holding the parent id (`packageId`, `packetId`, …). */
  paramName: string;
  resolveParent: (
    repos: RepositoryRegistry,
    parentId: string,
  ) => Promise<TParent | null>;
  notFoundMessage: (parentId: string) => string;
  createSchema: ZodType<TCreate>;
  list: (repos: RepositoryRegistry, parentId: string) => Promise<TEntity[]>;
  build: (
    body: TCreate,
    ctx: CreateContext & { parentId: string; parent: TParent },
  ) => TEntity;
  create: (repos: RepositoryRegistry, entity: TEntity) => Promise<TEntity>;
  /** Override the create path entirely (e.g. server-sequence retry loops). */
  performCreate?: (
    repos: RepositoryRegistry,
    body: TCreate,
    ctx: CreateContext & { parentId: string; parent: TParent },
  ) => Promise<TEntity | Response>;
  /** Run create + audit inside one transaction (gov't-audit atomicity). */
  transactionalCreate?: boolean;
  audit: {
    action: string;
    resourceType: string;
    decisionReason: (created: TEntity, parent: TParent) => string;
  };
}) {
  async function GET(_request: Request, { params }: RouteContext) {
    if (cfg.featureFlag && !isFeatureEnabled(cfg.featureFlag)) {
      return featureDisabledResponse(cfg.featureFlag);
    }
    const parentId = params[cfg.paramName];
    const repos = getRepositories();

    const parent = await cfg.resolveParent(repos, parentId);
    if (!parent) return notFoundResponse(cfg.notFoundMessage(parentId));

    const forbidden = await requireProjectAccess(parent.projectId);
    if (forbidden) return forbidden;

    const list = await cfg.list(repos, parentId);
    return Response.json({ status: 'success', data: list });
  }

  async function POST(request: Request, { params }: RouteContext) {
    if (cfg.featureFlag && !isFeatureEnabled(cfg.featureFlag)) {
      return featureDisabledResponse(cfg.featureFlag);
    }
    const rawBody: unknown = await request.json().catch(() => null);
    const parsed = parseRequestBody(cfg.createSchema, rawBody);
    if (!parsed.success) return parsed.response;

    const parentId = params[cfg.paramName];
    const repos = getRepositories();
    const parent = await cfg.resolveParent(repos, parentId);
    if (!parent) return notFoundResponse(cfg.notFoundMessage(parentId));

    const forbidden = await requireProjectAccess(parent.projectId);
    if (forbidden) return forbidden;

    const action = cfg.action ?? 'edit_basic';
    const currentUser = await getCurrentApiUser();
    if (
      !currentUser ||
      !(await canPerformProjectAction(currentUser, parent.projectId, action))
    ) {
      return forbiddenResponse(action);
    }

    const ctx = {
      projectId: parent.projectId,
      currentUser,
      parentId,
      parent,
    };
    const auditInput = (created: TEntity) => ({
      action: cfg.audit.action,
      resourceType: cfg.audit.resourceType,
      resourceId: created.id,
      projectId: parent.projectId,
      before: null,
      after: created,
      decisionReason: cfg.audit.decisionReason(created, parent),
      authorityBasis: `AUTHZ_MATRIX:${action}`,
      actor: currentUser,
    });

    if (cfg.transactionalCreate) {
      const entity = cfg.build(parsed.data, ctx);
      const created = await withTransactionalAudit(
        request,
        async (txRepos, appendAudit) => {
          const result = await cfg.create(txRepos, entity);
          await appendAudit(auditInput(result));
          return result;
        },
      );
      return Response.json({ status: 'success', data: created }, { status: 201 });
    }

    let created: TEntity;
    if (cfg.performCreate) {
      const result = await cfg.performCreate(repos, parsed.data, ctx);
      if (result instanceof Response) return result;
      created = result;
    } else {
      created = await cfg.create(repos, cfg.build(parsed.data, ctx));
    }

    await recordAuditEvent(request, auditInput(created));
    return Response.json({ status: 'success', data: created }, { status: 201 });
  }

  return { GET, POST };
}

/**
 * POST `/api/<entity>/[id]/transition` — pure-state-machine transitions
 * with PR-34 compare-and-swap inside a transactional audit. Routes with
 * extra gates beyond the state machine (evidence records, completeness
 * checklists, derived fields) stay hand-written.
 */
export function createTransitionRoute<
  TEntity extends { id: string },
  TTarget extends string,
>(cfg: {
  featureFlag?: KnownFeatureFlag;
  /** 422 IT_ONLY_FEATURE gate after authz, before the state machine. */
  requireIt?: boolean;
  paramName: string;
  schema: ZodType<{ targetState: TTarget }>;
  load: (repos: RepositoryRegistry, id: string) => Promise<TEntity | null>;
  notFoundMessage: (id: string) => string;
  projectIdOf: (entity: TEntity) => string;
  /**
   * Pure state-machine check. Returning a Response rejects the move
   * (the route surfaces it verbatim — pick 409/422 per surface
   * convention).
   */
  validate: (entity: TEntity, target: TTarget) => Response | null;
  buildPatch: (entity: TEntity, target: TTarget) => Partial<TEntity>;
  /** PR-34 CAS bound to the entity's transition repo. */
  cas: (
    txRepos: RepositoryRegistry,
    entity: TEntity,
    patch: Partial<TEntity>,
  ) => Promise<TEntity | null>;
  conflictLabel: string;
  audit: {
    action: string;
    resourceType: string;
    decisionReason: (entity: TEntity, target: TTarget) => string;
    /** Audit `before` projection; defaults to the full pre-update row. */
    beforeOf?: (entity: TEntity) => unknown;
    /** Audit `after` projection; defaults to the full updated row. */
    afterOf?: (updated: TEntity) => unknown;
  };
}) {
  async function POST(request: Request, { params }: RouteContext) {
    if (cfg.featureFlag && !isFeatureEnabled(cfg.featureFlag)) {
      return featureDisabledResponse(cfg.featureFlag);
    }
    const rawBody: unknown = await request.json().catch(() => null);
    const parsed = parseRequestBody(cfg.schema, rawBody);
    if (!parsed.success) return parsed.response;

    const repos = getRepositories();
    const id = params[cfg.paramName];
    const entity = await cfg.load(repos, id);
    if (!entity) return notFoundResponse(cfg.notFoundMessage(id));

    const projectId = cfg.projectIdOf(entity);
    const forbidden = await requireProjectAccess(projectId);
    if (forbidden) return forbidden;

    const currentUser = await getCurrentApiUser();
    if (!(await canPerformProjectAction(currentUser, projectId, 'edit_basic'))) {
      return forbiddenResponse('edit_basic');
    }

    if (cfg.requireIt) {
      const guard = await requireItProject(projectId);
      if (!guard.ok) return guard.response;
    }

    const target = parsed.data.targetState;
    const rejection = cfg.validate(entity, target);
    if (rejection) return rejection;

    const patch = cfg.buildPatch(entity, target);
    const updated = await withTransactionalAudit(
      request,
      async (txRepos, appendAudit) => {
        const result = await cfg.cas(txRepos, entity, patch);
        if (!result) throw STATE_CONFLICT;
        await appendAudit({
          action: cfg.audit.action,
          resourceType: cfg.audit.resourceType,
          resourceId: entity.id,
          projectId,
          before: cfg.audit.beforeOf ? cfg.audit.beforeOf(entity) : entity,
          after: cfg.audit.afterOf ? cfg.audit.afterOf(result) : result,
          decisionReason: cfg.audit.decisionReason(entity, target),
          authorityBasis: 'AUTHZ_MATRIX:edit_basic',
          actor: currentUser,
        });
        return result;
      },
    ).catch((err: unknown) => {
      if (err === STATE_CONFLICT) return null;
      throw err;
    });

    if (!updated) return stateConflictResponse(cfg.conflictLabel);
    return Response.json({ status: 'success', data: updated });
  }

  return { POST };
}
