/**
 * PR-3.5 — Pure helpers for the Gantt dependency graph.
 *
 * Operate on the shapes already in `src/types/gantt.ts`:
 *   - `GanttTask { id, start_date, end_date, duration, ... }`
 *   - `GanttLink { id, source, target, type, lagDays }`
 *
 * All functions are deterministic, side-effect-free, and node-env-safe
 * (no React / no Postgres / no Date.now). Tests live in
 * `dependency-graph.test.ts`.
 */

import type { GanttLink, GanttLinkType, GanttTask } from '@/types/gantt';

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Returns `true` if adding an edge `predecessorId → successorId` to the
 * existing dependency graph would close a cycle.
 *
 * Algorithm: DFS from `successorId` along the existing links; if we
 * reach `predecessorId`, adding the new edge would form a cycle.
 *
 * Self-edges (`predecessorId === successorId`) are also reported as
 * cycles — a task cannot depend on itself.
 */
export function wouldCreateCycle(
  existingLinks: readonly GanttLink[],
  proposed: { predecessorId: number; successorId: number },
): boolean {
  if (proposed.predecessorId === proposed.successorId) return true;

  // Build adjacency from existing edges: source → [targets].
  const outgoing = new Map<number, number[]>();
  for (const link of existingLinks) {
    const arr = outgoing.get(link.source) ?? [];
    arr.push(link.target);
    outgoing.set(link.source, arr);
  }

  // DFS from `successorId`. If we hit `predecessorId`, the new edge
  // closes a cycle (predecessor → successor → ... → predecessor).
  const stack: number[] = [proposed.successorId];
  const visited = new Set<number>();
  while (stack.length > 0) {
    const node = stack.pop()!;
    if (node === proposed.predecessorId) return true;
    if (visited.has(node)) continue;
    visited.add(node);
    const children = outgoing.get(node);
    if (children) {
      for (const child of children) stack.push(child);
    }
  }
  return false;
}

/**
 * Returns a topological ordering of task ids, or `null` when the graph
 * is cyclic. Uses Kahn's algorithm. Tasks not connected to any link
 * still appear in the result (order among unconnected nodes follows
 * the input `tasks` array).
 */
export function topologicalOrder(
  tasks: readonly GanttTask[],
  links: readonly GanttLink[],
): readonly number[] | null {
  const indegree = new Map<number, number>();
  const outgoing = new Map<number, number[]>();
  for (const task of tasks) {
    indegree.set(task.id, 0);
  }
  for (const link of links) {
    // Skip links that reference unknown tasks.
    if (!indegree.has(link.source) || !indegree.has(link.target)) continue;
    indegree.set(link.target, (indegree.get(link.target) ?? 0) + 1);
    const arr = outgoing.get(link.source) ?? [];
    arr.push(link.target);
    outgoing.set(link.source, arr);
  }

  // Seed queue with all zero-indegree nodes, preserving `tasks` order.
  const queue: number[] = [];
  for (const task of tasks) {
    if ((indegree.get(task.id) ?? 0) === 0) queue.push(task.id);
  }

  const result: number[] = [];
  while (queue.length > 0) {
    const node = queue.shift()!;
    result.push(node);
    const children = outgoing.get(node) ?? [];
    for (const child of children) {
      const next = (indegree.get(child) ?? 0) - 1;
      indegree.set(child, next);
      if (next === 0) queue.push(child);
    }
  }

  return result.length === tasks.length ? result : null;
}

export interface CriticalPathResult {
  /** Task ids whose total slack is zero (on the critical path). */
  criticalTaskIds: ReadonlySet<number>;
  /** Link ids whose source AND target are both on the critical path. */
  criticalLinkIds: ReadonlySet<number>;
  /** Earliest start day per task (offset in days from `origin`). */
  earliestStart: ReadonlyMap<number, number>;
  /** Latest start day per task (offset in days from `origin`). */
  latestStart: ReadonlyMap<number, number>;
  /** Project duration (days) — the latest finish across all tasks. */
  projectDurationDays: number;
}

/**
 * Forward + backward CPM pass over the dependency graph.
 *
 * Honors all four link types (`FS` / `SS` / `FF` / `SF`) and lag days.
 * If the graph is cyclic, returns an EMPTY result (`criticalTaskIds.size === 0`)
 * — callers should fall back to "no highlight" rather than throwing.
 *
 * Day arithmetic uses plain `Date.parse`; task duration is
 * `task.duration` (already 1-based, where a same-day task = 1).
 */
export function computeCriticalPath(
  tasks: readonly GanttTask[],
  links: readonly GanttLink[],
): CriticalPathResult {
  const emptyResult: CriticalPathResult = {
    criticalTaskIds: new Set(),
    criticalLinkIds: new Set(),
    earliestStart: new Map(),
    latestStart: new Map(),
    projectDurationDays: 0,
  };

  if (tasks.length === 0) return emptyResult;
  const order = topologicalOrder(tasks, links);
  if (order === null) return emptyResult;

  const taskById = new Map<number, GanttTask>();
  for (const task of tasks) taskById.set(task.id, task);

  // Origin = earliest start_date across all tasks; ES/EF are day-offsets.
  let originMs = Number.POSITIVE_INFINITY;
  for (const task of tasks) {
    const startMs = Date.parse(task.start_date);
    if (Number.isFinite(startMs) && startMs < originMs) originMs = startMs;
  }
  if (!Number.isFinite(originMs)) return emptyResult;
  const dayOffset = (iso: string): number =>
    Math.round((Date.parse(iso) - originMs) / DAY_MS);

  const earliestStart = new Map<number, number>();
  const earliestFinish = new Map<number, number>();
  const incoming = new Map<number, GanttLink[]>();
  for (const link of links) {
    if (!taskById.has(link.source) || !taskById.has(link.target)) continue;
    const arr = incoming.get(link.target) ?? [];
    arr.push(link);
    incoming.set(link.target, arr);
  }

  // Forward pass.
  for (const taskId of order) {
    const task = taskById.get(taskId);
    if (!task) continue;
    const baseStart = dayOffset(task.start_date);
    const duration = task.duration ?? 1;

    let earliest = baseStart;
    for (const link of incoming.get(taskId) ?? []) {
      const predStart = earliestStart.get(link.source);
      if (predStart === undefined) continue;
      const predDuration = taskById.get(link.source)?.duration ?? 1;
      const predFinish = predStart + predDuration;
      const lag = link.lagDays ?? 0;
      const candidate = startConstraintFor(link.type, predStart, predFinish, duration) + lag;
      if (candidate > earliest) earliest = candidate;
    }
    earliestStart.set(taskId, earliest);
    earliestFinish.set(taskId, earliest + duration);
  }

  const projectDurationDays = Math.max(
    0,
    ...Array.from(earliestFinish.values()),
  );

  // Backward pass.
  const latestStart = new Map<number, number>();
  const latestFinish = new Map<number, number>();
  const outgoing = new Map<number, GanttLink[]>();
  for (const link of links) {
    if (!taskById.has(link.source) || !taskById.has(link.target)) continue;
    const arr = outgoing.get(link.source) ?? [];
    arr.push(link);
    outgoing.set(link.source, arr);
  }

  for (let i = order.length - 1; i >= 0; i--) {
    const taskId = order[i];
    const task = taskById.get(taskId);
    if (!task) continue;
    const duration = task.duration ?? 1;
    const outs = outgoing.get(taskId) ?? [];

    let latest = projectDurationDays - duration;
    if (outs.length === 0) {
      // Sink: latestStart = projectDurationDays - duration.
      latest = projectDurationDays - duration;
    } else {
      latest = Number.POSITIVE_INFINITY;
      for (const link of outs) {
        const succStart = latestStart.get(link.target);
        if (succStart === undefined) continue;
        const succDuration = taskById.get(link.target)?.duration ?? 1;
        const succFinish = succStart + succDuration;
        const lag = link.lagDays ?? 0;
        // Latest start of predecessor is constrained by successor's
        // latest start/finish minus lag minus this task's duration.
        const candidate = latestConstraintFor(link.type, succStart, succFinish, duration) - lag;
        if (candidate < latest) latest = candidate;
      }
      if (!Number.isFinite(latest)) latest = projectDurationDays - duration;
    }

    latestStart.set(taskId, latest);
    latestFinish.set(taskId, latest + duration);
  }

  // Slack = latestStart - earliestStart. Zero (or below — defensive)
  // means critical.
  const criticalTaskIds = new Set<number>();
  for (const taskId of order) {
    const es = earliestStart.get(taskId);
    const ls = latestStart.get(taskId);
    if (es === undefined || ls === undefined) continue;
    if (ls - es <= 0) criticalTaskIds.add(taskId);
  }

  const criticalLinkIds = new Set<number>();
  for (const link of links) {
    if (criticalTaskIds.has(link.source) && criticalTaskIds.has(link.target)) {
      criticalLinkIds.add(link.id);
    }
  }

  return {
    criticalTaskIds,
    criticalLinkIds,
    earliestStart,
    latestStart,
    projectDurationDays,
  };
}

/**
 * Forward-pass constraint: given a predecessor's start (PS) and finish
 * (PF), and the successor's own duration, return the earliest
 * day-offset the successor can START at to satisfy this link type.
 * Lag is added by the caller.
 */
function startConstraintFor(
  type: GanttLinkType,
  predecessorStart: number,
  predecessorFinish: number,
  successorDuration: number,
): number {
  switch (type) {
    case 'FS':
      // Finish-to-Start: successor.start >= predecessor.finish
      return predecessorFinish;
    case 'SS':
      // Start-to-Start: successor.start >= predecessor.start
      return predecessorStart;
    case 'FF':
      // Finish-to-Finish: successor.finish >= predecessor.finish
      //                 → successor.start >= predecessor.finish - successor.duration
      return predecessorFinish - successorDuration;
    case 'SF':
      // Start-to-Finish: successor.finish >= predecessor.start
      //                 → successor.start >= predecessor.start - successor.duration
      return predecessorStart - successorDuration;
  }
}

/**
 * Backward-pass constraint: given the successor's latest-start (SLS)
 * and latest-finish (SLF), and the predecessor's duration, return the
 * latest day-offset the predecessor can START at to satisfy this link
 * type. Lag is subtracted by the caller.
 */
function latestConstraintFor(
  type: GanttLinkType,
  successorLatestStart: number,
  successorLatestFinish: number,
  predecessorDuration: number,
): number {
  switch (type) {
    case 'FS':
      // pred.finish <= succ.start → pred.start <= succ.start - pred.duration
      return successorLatestStart - predecessorDuration;
    case 'SS':
      // pred.start <= succ.start
      return successorLatestStart;
    case 'FF':
      // pred.finish <= succ.finish → pred.start <= succ.finish - pred.duration
      return successorLatestFinish - predecessorDuration;
    case 'SF':
      // pred.start <= succ.finish
      return successorLatestFinish;
  }
}
