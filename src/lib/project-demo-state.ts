import { get, put } from '@vercel/blob';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { getAuditLogStore } from '@/lib/audit-log-store';
import { getBoqStore } from '@/lib/boq-store';
import { getChangeRequestStore } from '@/lib/change-request-store';
import { getDailyReportStore } from '@/lib/daily-report-store';
import { getDocumentStore } from '@/lib/document-store';
import { getEvmProjectRegistry, getEvmStore } from '@/lib/evm-store';
import { getGanttStore } from '@/lib/gantt-store';
import { getIssueStore } from '@/lib/issue-store';
import { getMilestoneStore } from '@/lib/milestone-store';
import { getNotificationStore } from '@/lib/notification-store';
import { getProjectMembershipStore } from '@/lib/project-membership-store';
import { getProjectStore } from '@/lib/project-store';
import { getQualityGateStore } from '@/lib/quality-gate-store';
import { getQualityStore } from '@/lib/quality-store';
import { getRiskStore } from '@/lib/risk-store';
import { getWbsStore } from '@/lib/wbs-store';
import type { DocumentData } from '@/types/document';
import type { GanttData } from '@/types/gantt';
import type { InspectionsData } from '@/types/quality';

const PROJECT_DEMO_STATE_BLOB_PATH = 'demo-state/project-demo-state.json';
const PROJECT_DEMO_STATE_BLOB_ACCESS = 'public' as const;

declare global {
  // eslint-disable-next-line no-var
  var __nsmProjectDemoStateHydrated: boolean | undefined;
  // eslint-disable-next-line no-var
  var __nsmProjectDemoStateHydrationPromise: Promise<void> | undefined;
  // eslint-disable-next-line no-var
  var __nsmProjectDemoStatePersistPromise: Promise<void> | undefined;
}

export interface ProjectDemoStateSnapshot {
  projects: ReturnType<typeof getProjectStore>;
  projectMemberships: ReturnType<typeof getProjectMembershipStore>;
  milestones: ReturnType<typeof getMilestoneStore>;
  wbs: ReturnType<typeof getWbsStore>;
  boq: ReturnType<typeof getBoqStore>;
  ganttByProject: ReturnType<typeof getGanttStore>;
  documentsByProject: ReturnType<typeof getDocumentStore>;
  qualityGates: ReturnType<typeof getQualityGateStore>;
  quality: InspectionsData;
  risks: ReturnType<typeof getRiskStore>;
  issues: ReturnType<typeof getIssueStore>;
  dailyReports: ReturnType<typeof getDailyReportStore>;
  evmPoints: ReturnType<typeof getEvmStore>;
  evmProjectIds: string[];
  changeRequests: ReturnType<typeof getChangeRequestStore>;
  notifications: ReturnType<typeof getNotificationStore>;
  auditLogs: ReturnType<typeof getAuditLogStore>;
}

function cloneValue<T>(value: T): T {
  return structuredClone(value);
}

function resolveLocalProjectDemoStateFile() {
  const configuredPath = process.env.PROJECT_DEMO_STATE_FILE?.trim();

  if (!configuredPath) {
    return path.join(process.cwd(), '.data', 'project-demo-state.json');
  }

  return path.isAbsolute(configuredPath)
    ? configuredPath
    : path.join(process.cwd(), configuredPath);
}

function shouldUseBlobProjectDemoState() {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

function seedProjectDemoStateStores() {
  getProjectStore();
  getProjectMembershipStore();
  getMilestoneStore();
  getWbsStore();
  getBoqStore();
  getGanttStore();
  getDocumentStore();
  getQualityGateStore();
  getQualityStore();
  getRiskStore();
  getIssueStore();
  getDailyReportStore();
  getEvmStore();
  getEvmProjectRegistry();
  getChangeRequestStore();
  getNotificationStore();
  getAuditLogStore();
}

function replaceArrayContents<T>(target: T[], source: T[]) {
  target.splice(0, target.length, ...cloneValue(source));
}

function replaceRecordArrayContents<T>(
  target: Record<string, T[]>,
  source: Record<string, T[]>,
) {
  Object.keys(target).forEach((key) => {
    if (!(key in source)) {
      delete target[key];
    }
  });

  Object.entries(source).forEach(([key, value]) => {
    if (!target[key]) {
      target[key] = cloneValue(value);
      return;
    }

    replaceArrayContents(target[key], value);
  });
}

function replaceGanttData(target: GanttData, source: GanttData) {
  replaceArrayContents(target.data, source.data);
  replaceArrayContents(target.links, source.links);
}

function replaceGanttStoreContents(
  target: Record<string, GanttData>,
  source: Record<string, GanttData>,
) {
  Object.keys(target).forEach((key) => {
    if (!(key in source)) {
      delete target[key];
    }
  });

  Object.entries(source).forEach(([key, value]) => {
    if (!target[key]) {
      target[key] = cloneValue(value);
      return;
    }

    replaceGanttData(target[key], value);
  });
}

function replaceDocumentData(target: DocumentData, source: DocumentData) {
  replaceArrayContents(target.folders, source.folders);
  replaceArrayContents(target.files, source.files);
  replaceRecordArrayContents(target.versionHistory, source.versionHistory);
  replaceArrayContents(target.permissions, source.permissions);
}

function replaceDocumentStoreContents(
  target: Record<string, DocumentData>,
  source: Record<string, DocumentData>,
) {
  Object.keys(target).forEach((key) => {
    if (!(key in source)) {
      delete target[key];
    }
  });

  Object.entries(source).forEach(([key, value]) => {
    if (!target[key]) {
      target[key] = cloneValue(value);
      return;
    }

    replaceDocumentData(target[key], value);
  });
}

function replaceQualityStoreContents(target: InspectionsData, source: InspectionsData) {
  replaceArrayContents(target.itpItems, source.itpItems);
  replaceArrayContents(target.inspectionRecords, source.inspectionRecords);
}

function replaceSetContents(target: Set<string>, source: string[]) {
  target.clear();
  source.forEach((value) => {
    target.add(value);
  });
}

export function captureProjectDemoStateSnapshot(): ProjectDemoStateSnapshot {
  seedProjectDemoStateStores();

  return {
    projects: cloneValue(getProjectStore()),
    projectMemberships: cloneValue(getProjectMembershipStore()),
    milestones: cloneValue(getMilestoneStore()),
    wbs: cloneValue(getWbsStore()),
    boq: cloneValue(getBoqStore()),
    ganttByProject: cloneValue(getGanttStore()),
    documentsByProject: cloneValue(getDocumentStore()),
    qualityGates: cloneValue(getQualityGateStore()),
    quality: cloneValue(getQualityStore()),
    risks: cloneValue(getRiskStore()),
    issues: cloneValue(getIssueStore()),
    dailyReports: cloneValue(getDailyReportStore()),
    evmPoints: cloneValue(getEvmStore()),
    evmProjectIds: Array.from(getEvmProjectRegistry()),
    changeRequests: cloneValue(getChangeRequestStore()),
    notifications: cloneValue(getNotificationStore()),
    auditLogs: cloneValue(getAuditLogStore()),
  };
}

export function applyProjectDemoStateSnapshot(snapshot: ProjectDemoStateSnapshot) {
  seedProjectDemoStateStores();

  replaceArrayContents(getProjectStore(), snapshot.projects);
  replaceArrayContents(getProjectMembershipStore(), snapshot.projectMemberships);
  replaceArrayContents(getMilestoneStore(), snapshot.milestones);
  replaceArrayContents(getWbsStore(), snapshot.wbs);
  replaceArrayContents(getBoqStore(), snapshot.boq);
  replaceGanttStoreContents(getGanttStore(), snapshot.ganttByProject);
  replaceDocumentStoreContents(getDocumentStore(), snapshot.documentsByProject);
  replaceArrayContents(getQualityGateStore(), snapshot.qualityGates);
  replaceQualityStoreContents(getQualityStore(), snapshot.quality);
  replaceArrayContents(getRiskStore(), snapshot.risks);
  replaceArrayContents(getIssueStore(), snapshot.issues);
  replaceArrayContents(getDailyReportStore(), snapshot.dailyReports);
  replaceArrayContents(getEvmStore(), snapshot.evmPoints);
  replaceSetContents(getEvmProjectRegistry(), snapshot.evmProjectIds);
  replaceArrayContents(getChangeRequestStore(), snapshot.changeRequests);
  replaceArrayContents(getNotificationStore(), snapshot.notifications);
  replaceArrayContents(getAuditLogStore(), snapshot.auditLogs);
}

async function readPersistedProjectDemoState() {
  try {
    if (shouldUseBlobProjectDemoState()) {
      const result = await get(PROJECT_DEMO_STATE_BLOB_PATH, {
        access: PROJECT_DEMO_STATE_BLOB_ACCESS,
      });

      if (!result || result.statusCode !== 200 || !result.stream) {
        return null;
      }

      const contents = await new Response(result.stream).text();
      return JSON.parse(contents) as ProjectDemoStateSnapshot;
    }

    const contents = await readFile(resolveLocalProjectDemoStateFile(), 'utf8');
    return JSON.parse(contents) as ProjectDemoStateSnapshot;
  } catch (error) {
    if (
      error instanceof Error &&
      'code' in error &&
      (error as NodeJS.ErrnoException).code === 'ENOENT'
    ) {
      return null;
    }

    console.error('Failed to read persisted project demo state', error);
    return null;
  }
}

async function writePersistedProjectDemoState(snapshot: ProjectDemoStateSnapshot) {
  const contents = JSON.stringify(snapshot, null, 2);

  if (shouldUseBlobProjectDemoState()) {
    await put(PROJECT_DEMO_STATE_BLOB_PATH, contents, {
      access: PROJECT_DEMO_STATE_BLOB_ACCESS,
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: 'application/json; charset=utf-8',
    });
    return;
  }

  const localFile = resolveLocalProjectDemoStateFile();
  await mkdir(path.dirname(localFile), { recursive: true });
  await writeFile(localFile, contents, 'utf8');
}

export async function ensureProjectDemoStateHydrated() {
  if (globalThis.__nsmProjectDemoStateHydrated) {
    return;
  }

  if (!globalThis.__nsmProjectDemoStateHydrationPromise) {
    globalThis.__nsmProjectDemoStateHydrationPromise = (async () => {
      seedProjectDemoStateStores();
      const persistedState = await readPersistedProjectDemoState();

      if (persistedState) {
        applyProjectDemoStateSnapshot(persistedState);
      }

      globalThis.__nsmProjectDemoStateHydrated = true;
    })().catch((error) => {
      globalThis.__nsmProjectDemoStateHydrationPromise = undefined;
      throw error;
    });
  }

  await globalThis.__nsmProjectDemoStateHydrationPromise;
}

export async function persistProjectDemoState() {
  await ensureProjectDemoStateHydrated();

  const previousPersist = globalThis.__nsmProjectDemoStatePersistPromise ?? Promise.resolve();
  const nextPersist = previousPersist.then(async () => {
    const snapshot = captureProjectDemoStateSnapshot();
    await writePersistedProjectDemoState(snapshot);
  });

  globalThis.__nsmProjectDemoStatePersistPromise = nextPersist.finally(() => {
    if (globalThis.__nsmProjectDemoStatePersistPromise === nextPersist) {
      globalThis.__nsmProjectDemoStatePersistPromise = undefined;
    }
  });

  await nextPersist;
}
