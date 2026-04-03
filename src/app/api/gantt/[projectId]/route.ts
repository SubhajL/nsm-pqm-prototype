import dayjs from 'dayjs';
import { canManageGantt } from '@/lib/auth';
import { getGanttDataForProject, getNextGanttTaskId } from '@/lib/gantt-store';
import { syncProjectExecutionState } from '@/lib/project-execution-sync';
import { getCurrentApiUser, requireProjectAccess } from '@/lib/project-api-access';
import type { GanttLinkType, GanttTask } from '@/types/gantt';

interface GanttRequestBody {
  id?: number;
  text?: string;
  start_date?: string;
  end_date?: string;
  progress?: number;
  parent?: number;
  type?: string;
  owner?: string;
  predecessorIds?: number[];
  predecessors?: Array<{
    taskId?: number;
    linkType?: GanttLinkType;
    lagDays?: number;
  }>;
}

interface ParsedPredecessor {
  taskId: number;
  linkType: GanttLinkType;
  lagDays: number;
}

function badRequest(message: string) {
  return Response.json(
    {
      status: 'error',
      error: { code: 'BAD_REQUEST', message },
    },
    { status: 400 },
  );
}

function forbiddenWriteResponse() {
  return Response.json(
    {
      status: 'error',
      error: {
        code: 'FORBIDDEN',
        message: 'Only project managers, coordinators, or system admins can manage Gantt items',
      },
    },
    { status: 403 },
  );
}

function normalizeProgress(progress: number | undefined) {
  if (progress === undefined || Number.isNaN(progress)) {
    return 0;
  }

  const normalized = progress > 1 ? progress / 100 : progress;
  return Math.min(1, Math.max(0, normalized));
}

function createDuration(startDate: string, endDate: string) {
  const start = dayjs(startDate);
  const end = dayjs(endDate);

  if (!start.isValid() || !end.isValid() || end.isBefore(start)) {
    return null;
  }

  return Math.max(end.diff(start, 'day') + 1, 1);
}

function validateTaskInput(body: GanttRequestBody) {
  const text = body.text?.trim();
  const owner = body.owner?.trim() ?? '';
  const startDate = body.start_date;
  const endDate = body.end_date;

  if (!text) {
    return { error: badRequest('text is required') };
  }

  if (!startDate || !endDate) {
    return { error: badRequest('start_date and end_date are required') };
  }

  const duration = createDuration(startDate, endDate);

  if (!duration) {
    return { error: badRequest('end_date must be the same day or after start_date') };
  }

  const predecessors = Array.isArray(body.predecessors)
    ? body.predecessors
        .map((entry) => ({
          taskId: Number(entry.taskId),
          linkType: normalizeLinkType(entry.linkType),
          lagDays: Number.isFinite(Number(entry.lagDays)) ? Math.trunc(Number(entry.lagDays)) : 0,
        }))
        .filter((entry) => Number.isInteger(entry.taskId) && entry.taskId > 0)
    : Array.isArray(body.predecessorIds)
      ? body.predecessorIds
          .map((value) => Number(value))
          .filter((value) => Number.isInteger(value) && value > 0)
          .map((taskId) => ({ taskId, linkType: 'FS' as GanttLinkType, lagDays: 0 }))
      : [];

  return {
    value: {
      text,
      owner,
      start_date: startDate,
      end_date: endDate,
      duration,
      progress: normalizeProgress(body.progress),
      parent: body.parent ?? 0,
      type: body.type ?? 'task',
      predecessors,
    },
  };
}

function normalizeLinkType(linkType: string | undefined): GanttLinkType {
  switch (linkType) {
    case 'SS':
    case 'FF':
    case 'SF':
      return linkType;
    case 'FS':
    default:
      return 'FS';
  }
}

function validatePredecessors(
  taskId: number | null,
  predecessors: ParsedPredecessor[],
  tasks: GanttTask[],
) {
  const seen = new Set<number>();

  for (const predecessor of predecessors) {
    if (seen.has(predecessor.taskId)) {
      continue;
    }
    seen.add(predecessor.taskId);

    const predecessorTask = tasks.find((entry) => entry.id === predecessor.taskId);
    if (!predecessorTask || predecessorTask.type === 'project') {
      return badRequest('predecessor task not found');
    }

    if (taskId !== null && predecessor.taskId === taskId) {
      return badRequest('task cannot depend on itself');
    }
  }

  return null;
}

function replaceIncomingLinks(
  store: ReturnType<typeof getGanttDataForProject>,
  targetId: number,
  predecessors: ParsedPredecessor[],
) {
  store.links = store.links.filter((link) => link.target !== targetId);

  if (predecessors.length === 0) {
    return;
  }

  let nextId =
    store.links.reduce((max, link) => Math.max(max, Number(link.id) || 0), 0) + 1;

  predecessors.forEach((predecessor) => {
    store.links.push({
      id: nextId++,
      source: predecessor.taskId,
      target: targetId,
      type: predecessor.linkType,
      lagDays: predecessor.lagDays,
    });
  });
}

function ensureCanManageGantt() {
  const currentUser = getCurrentApiUser();

  if (!currentUser || !canManageGantt(currentUser.role)) {
    return forbiddenWriteResponse();
  }

  return null;
}

function collectDescendantIds(tasks: GanttTask[], rootId: number) {
  const ids = new Set<number>([rootId]);
  let expanded = true;

  while (expanded) {
    expanded = false;
    for (const task of tasks) {
      if (!ids.has(task.id) && ids.has(task.parent)) {
        ids.add(task.id);
        expanded = true;
      }
    }
  }

  return ids;
}

export async function GET(
  _request: Request,
  { params }: { params: { projectId: string } },
) {
  await new Promise((resolve) => setTimeout(resolve, 150));
  const forbidden = requireProjectAccess(params.projectId);
  if (forbidden) return forbidden;

  const store = getGanttDataForProject(params.projectId);

  return Response.json({ status: 'success', data: store });
}

export async function POST(
  request: Request,
  { params }: { params: { projectId: string } },
) {
  await new Promise((resolve) => setTimeout(resolve, 150));
  const forbidden = requireProjectAccess(params.projectId);
  if (forbidden) return forbidden;

  const cannotManage = ensureCanManageGantt();
  if (cannotManage) return cannotManage;

  const body = (await request.json()) as GanttRequestBody;
  const parsed = validateTaskInput(body);
  if (parsed.error) return parsed.error;

  const store = getGanttDataForProject(params.projectId);
  const parent = parsed.value.parent;
  if (parent !== 0 && !store.data.some((task) => task.id === parent)) {
    return badRequest('parent task not found');
  }

  const predecessorError = validatePredecessors(
    null,
    parsed.value.predecessors,
    store.data,
  );
  if (predecessorError) return predecessorError;

  const newTask: GanttTask = {
    id: getNextGanttTaskId(params.projectId),
    text: parsed.value.text,
    owner: parsed.value.owner,
    start_date: parsed.value.start_date,
    end_date: parsed.value.end_date,
    duration: parsed.value.duration,
    progress: parsed.value.progress,
    parent: parsed.value.parent,
    type: parsed.value.type,
    baseline_start_date: parsed.value.start_date,
    baseline_end_date: parsed.value.end_date,
  };

  store.data.push(newTask);
  replaceIncomingLinks(store, newTask.id, parsed.value.predecessors);
  syncProjectExecutionState(params.projectId, { updatedTask: newTask });

  return Response.json({ status: 'success', data: newTask }, { status: 201 });
}

export async function PATCH(
  request: Request,
  { params }: { params: { projectId: string } },
) {
  await new Promise((resolve) => setTimeout(resolve, 150));
  const forbidden = requireProjectAccess(params.projectId);
  if (forbidden) return forbidden;

  const cannotManage = ensureCanManageGantt();
  if (cannotManage) return cannotManage;

  const body = (await request.json()) as GanttRequestBody;

  if (!body.id) {
    return badRequest('id is required');
  }

  const parsed = validateTaskInput(body);
  if (parsed.error) return parsed.error;

  const store = getGanttDataForProject(params.projectId);
  const task = store.data.find((entry) => entry.id === body.id);

  if (!task) {
    return Response.json(
      {
        status: 'error',
        error: { code: 'NOT_FOUND', message: 'Gantt task not found' },
      },
      { status: 404 },
    );
  }

  const parent = parsed.value.parent;
  if (parent !== 0 && !store.data.some((entry) => entry.id === parent && entry.id !== task.id)) {
    return badRequest('parent task not found');
  }

  if (parent === task.id) {
    return badRequest('task cannot be its own parent');
  }

  const predecessorError = validatePredecessors(
    task.id,
    parsed.value.predecessors,
    store.data,
  );
  if (predecessorError) return predecessorError;

  Object.assign(task, {
    text: parsed.value.text,
    owner: parsed.value.owner,
    start_date: parsed.value.start_date,
    end_date: parsed.value.end_date,
    duration: parsed.value.duration,
    progress: parsed.value.progress,
    parent: parsed.value.parent,
    type: parsed.value.type,
  });
  replaceIncomingLinks(store, task.id, parsed.value.predecessors);
  syncProjectExecutionState(params.projectId, { updatedTask: task });

  return Response.json({ status: 'success', data: task });
}

export async function DELETE(
  request: Request,
  { params }: { params: { projectId: string } },
) {
  await new Promise((resolve) => setTimeout(resolve, 150));
  const forbidden = requireProjectAccess(params.projectId);
  if (forbidden) return forbidden;

  const cannotManage = ensureCanManageGantt();
  if (cannotManage) return cannotManage;

  const body = (await request.json()) as { id?: number };

  if (!body.id) {
    return badRequest('id is required');
  }

  const store = getGanttDataForProject(params.projectId);
  const task = store.data.find((entry) => entry.id === body.id);

  if (!task) {
    return Response.json(
      {
        status: 'error',
        error: { code: 'NOT_FOUND', message: 'Gantt task not found' },
      },
      { status: 404 },
    );
  }

  const deletedTask = { ...task };
  const idsToDelete = collectDescendantIds(store.data, task.id);
  store.data = store.data.filter((entry) => !idsToDelete.has(entry.id));
  store.links = store.links.filter(
    (link) => !idsToDelete.has(link.source) && !idsToDelete.has(link.target),
  );
  syncProjectExecutionState(params.projectId, { deletedTask });

  return Response.json({ status: 'success', data: { id: task.id } });
}
