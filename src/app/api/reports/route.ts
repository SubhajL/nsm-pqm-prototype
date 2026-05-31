export const dynamic = 'force-dynamic';

import { cookies } from 'next/headers';

import { AUTH_COOKIE_USER_ID } from '@/lib/auth';
import { getActiveUser } from '@/lib/project-access';
import { requireProjectAccess } from '@/lib/project-api-access';
import { getRepositories } from '@/lib/repositories';
import { buildDelayReport } from '@/lib/rid/reporting/delay-report';
import { buildMonthlyReport } from '@/lib/rid/reporting/monthly-report';
import { buildWorkPeriodReport } from '@/lib/rid/reporting/work-period-report';
import {
  REPORT_KINDS,
  type RidReportKind,
} from '@/lib/rid/reporting/reporting-types';

/**
 * GET /api/reports
 *
 * Returns a `RidReportData` document for the requested project + kind.
 *
 * Query parameters:
 *   - `projectId` (required) — the project to report on. Must be in the
 *     caller's visible set (403 otherwise).
 *   - `kind` (required) — one of `monthly | work_period | delay`.
 *   - `periodStart`, `periodEnd` (required for `monthly`) — ISO 8601
 *     dates (`YYYY-MM-DD`).
 *   - `workPeriodId` (required for `work_period`) — the งวด to report
 *     on. Must belong to `projectId`.
 *
 * Auth follows the standard pattern: `getActiveUser` → 401 if no user,
 * `requireProjectAccess(projectId)` → 401/403 envelope when the project
 * is not visible.
 */
export async function GET(request: Request) {
  const currentUser = await getActiveUser(
    cookies().get(AUTH_COOKIE_USER_ID)?.value,
  );
  if (!currentUser) {
    return Response.json(
      {
        status: 'error',
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
      },
      { status: 401 },
    );
  }

  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get('projectId');
  const kind = searchParams.get('kind') as RidReportKind | null;

  if (!projectId) {
    return Response.json(
      {
        status: 'error',
        error: { code: 'BAD_REQUEST', message: 'projectId is required' },
      },
      { status: 400 },
    );
  }

  if (!kind || !REPORT_KINDS.includes(kind)) {
    return Response.json(
      {
        status: 'error',
        error: {
          code: 'BAD_REQUEST',
          message: `kind must be one of: ${REPORT_KINDS.join(', ')}`,
        },
      },
      { status: 400 },
    );
  }

  const forbidden = await requireProjectAccess(projectId);
  if (forbidden) return forbidden;

  const repos = getRepositories();
  const project = await repos.projects.findById(projectId);
  if (!project) {
    return Response.json(
      {
        status: 'error',
        error: { code: 'NOT_FOUND', message: `Project ${projectId} not found` },
      },
      { status: 404 },
    );
  }

  // Resolve a supervising engineer name from the team membership table.
  // Falls back to null when no engineer is assigned (the signatory row
  // is then emitted with a blank name for hand-fill).
  const engineerName = await resolveEngineerName(projectId);

  // The caller never supplies `generatedAt`; the route stamps it once
  // at request time. Routes are dynamic so caching is not a concern.
  const generatedAt = new Date().toISOString();

  if (kind === 'monthly') {
    const periodStart = searchParams.get('periodStart');
    const periodEnd = searchParams.get('periodEnd');
    if (!periodStart || !periodEnd) {
      return Response.json(
        {
          status: 'error',
          error: {
            code: 'BAD_REQUEST',
            message:
              'periodStart and periodEnd are required for monthly reports',
          },
        },
        { status: 400 },
      );
    }
    const evmData = await repos.evm.list();
    const projectEvm = evmData.filter((p) => p.projectId === projectId);

    // Evidence docs: the live RID form embeds photo thumbnails, but
    // the prototype just emits a count + most-recent id list. PR-29
    // does not yet thread per-project document attachments through
    // here — that lands when the document folder ↔ project linkage is
    // tightened. For now the section renders the "0 attached" placeholder.
    const evidenceDocIds: string[] = [];

    const report = buildMonthlyReport({
      project,
      evmData: projectEvm,
      periodStart,
      periodEnd,
      evidenceDocIds,
      engineerName,
      generatedAt,
    });
    return Response.json({ status: 'success', data: report });
  }

  if (kind === 'work_period') {
    const workPeriodId = searchParams.get('workPeriodId');
    if (!workPeriodId) {
      return Response.json(
        {
          status: 'error',
          error: {
            code: 'BAD_REQUEST',
            message: 'workPeriodId is required for work_period reports',
          },
        },
        { status: 400 },
      );
    }
    const workPeriod = await repos.workPeriods.findById(workPeriodId);
    if (!workPeriod || workPeriod.projectId !== projectId) {
      return Response.json(
        {
          status: 'error',
          error: {
            code: 'NOT_FOUND',
            message: `WorkPeriod ${workPeriodId} not found for project ${projectId}`,
          },
        },
        { status: 404 },
      );
    }
    const slips = await repos.deliverySlips.listByWorkPeriod(workPeriodId);
    const report = buildWorkPeriodReport({
      project,
      workPeriod,
      deliverySlips: slips,
      engineerName,
      generatedAt,
    });
    return Response.json({ status: 'success', data: report });
  }

  // kind === 'delay'
  const gantt = await repos.gantt.getProjectData(projectId);
  const ganttTasks = gantt?.data ?? [];
  const evaluationDate = searchParams.get('evaluationDate') ??
    new Date().toISOString().slice(0, 10);
  const report = buildDelayReport({
    project,
    ganttTasks,
    lifecycleHistory: project.lifecycleStageHistory,
    evaluationDate,
    engineerName,
    generatedAt,
  });
  return Response.json({ status: 'success', data: report });
}

async function resolveEngineerName(projectId: string): Promise<string | null> {
  const repos = getRepositories();
  const memberships = await repos.teamMemberships.listByProject(projectId);
  const engineer = memberships.find((m) => m.assignmentRole === 'engineer');
  if (!engineer) return null;
  const user = await repos.users.findById(engineer.userId);
  return user?.name ?? null;
}
