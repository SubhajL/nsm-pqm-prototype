import { canAccessAdmin } from '@/lib/auth';
import { getVisibleProjectIdsForCurrentUser, requireProjectAccess } from '@/lib/project-api-access';
import { getCurrentApiUser } from '@/lib/project-api-access';
import { getIssueStore } from '@/lib/issue-store';
import {
  removeAutoNcrIssuesForInspection,
  synchronizeAutoNcrIssues,
  synchronizeItpStatuses,
} from '@/lib/quality-consistency';
import { getQualityStore } from '@/lib/quality-store';

const store = getQualityStore();
const issueStore = getIssueStore();

function canManageQuality(role: string | null | undefined) {
  return Boolean(role && (canAccessAdmin(role) || role === 'Project Manager' || role === 'Engineer'));
}

export async function GET(request: Request) {
  await new Promise((resolve) => setTimeout(resolve, 150));

  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get('projectId');

  let itpItems = [...store.itpItems];
  let inspectionRecords = [...store.inspectionRecords];

  if (projectId) {
    const forbidden = requireProjectAccess(projectId);
    if (forbidden) return forbidden;

    itpItems = itpItems.filter((item) => item.projectId === projectId);
    inspectionRecords = inspectionRecords.filter(
      (record) => record.projectId === projectId,
    );
  } else {
    const visibleProjectIds = getVisibleProjectIdsForCurrentUser();
    itpItems = itpItems.filter((item) => visibleProjectIds.has(item.projectId));
    inspectionRecords = inspectionRecords.filter((record) => visibleProjectIds.has(record.projectId));
  }

  return Response.json({
    status: 'success',
    data: { itpItems, inspectionRecords },
  });
}

export async function POST(request: Request) {
  await new Promise((resolve) => setTimeout(resolve, 150));

  const currentUser = getCurrentApiUser();

  if (!currentUser || !canManageQuality(currentUser.role)) {
    return Response.json(
      {
        status: 'error',
        error: {
          code: 'FORBIDDEN',
          message: 'Only project managers, engineers, or system admins can manage quality inspections',
        },
      },
      { status: 403 },
    );
  }

  const body = (await request.json()) as {
    projectId?: string;
    itpId?: string;
    title?: string;
    date?: string;
    time?: string;
    inspectors?: string[];
    wbsLink?: string;
    standards?: string[];
    overallResult?: 'pass' | 'conditional';
    failReason?: string;
  };

  if (!body.projectId) {
    return Response.json(
      {
        status: 'error',
        error: { code: 'BAD_REQUEST', message: 'projectId is required' },
      },
      { status: 400 },
    );
  }

  const forbidden = requireProjectAccess(body.projectId);
  if (forbidden) return forbidden;

  const itpItem = store.itpItems.find(
    (item) => item.projectId === body.projectId && item.id === body.itpId,
  );

  if (!itpItem) {
    return Response.json(
      {
        status: 'error',
        error: { code: 'BAD_REQUEST', message: 'ไม่พบรายการ ITP ที่เลือก' },
      },
      { status: 400 },
    );
  }

  if (!body.title?.trim() || !body.date || !body.time || !body.wbsLink?.trim()) {
    return Response.json(
      {
        status: 'error',
        error: { code: 'BAD_REQUEST', message: 'title, date, time, and wbsLink are required' },
      },
      { status: 400 },
    );
  }

  const overallResult = body.overallResult ?? 'pass';
  const failReason =
    overallResult === 'conditional'
      ? body.failReason?.trim() || 'พบรายการที่ไม่ผ่าน ต้องแก้ไขก่อนดำเนินการต่อ'
      : '';

  const newRecord = {
    id: `insp-${String(store.inspectionRecords.length + 1).padStart(3, '0')}`,
    projectId: body.projectId,
    itpId: itpItem.id,
    title: body.title.trim(),
    date: body.date,
    time: body.time,
    inspectors: body.inspectors?.filter(Boolean) ?? [],
    wbsLink: body.wbsLink.trim(),
    standards: body.standards?.filter(Boolean) ?? [itpItem.standard],
    checklist: [
      {
        id: `cl-${crypto.randomUUID().slice(0, 8)}`,
        item: 'ตรวจเอกสารอ้างอิง',
        criteria: itpItem.standard,
        result: 'pass' as const,
        note: 'เอกสารถูกต้อง',
      },
      {
        id: `cl-${crypto.randomUUID().slice(0, 8)}`,
        item: itpItem.item,
        criteria: 'เป็นไปตามเกณฑ์การตรวจ',
        result: overallResult === 'pass' ? 'pass' as const : 'fail' as const,
        note: overallResult === 'pass' ? 'ผ่านการตรวจ' : failReason,
      },
      {
        id: `cl-${crypto.randomUUID().slice(0, 8)}`,
        item: 'บันทึกรูปถ่ายและพยานหลักฐาน',
        criteria: 'มีหลักฐานครบถ้วน',
        result: 'pass' as const,
        note: 'แนบหลักฐานครบ',
      },
    ],
    overallResult,
    failReason,
    autoNCR: overallResult === 'conditional',
    workflowStatus: 'draft' as const,
  };

  store.inspectionRecords.push(newRecord);
  synchronizeItpStatuses(store);
  synchronizeAutoNcrIssues(issueStore, [newRecord]);

  return Response.json({ status: 'success', data: newRecord }, { status: 201 });
}

const VALID_TRANSITIONS: Record<string, string> = {
  'draft→confirmed': 'confirmed',
  'confirmed→signed': 'signed',
};

export async function PATCH(request: Request) {
  await new Promise((resolve) => setTimeout(resolve, 150));

  const currentUser = getCurrentApiUser();

  if (!currentUser || !canManageQuality(currentUser.role)) {
    return Response.json(
      {
        status: 'error',
        error: {
          code: 'FORBIDDEN',
          message: 'Only project managers, engineers, or system admins can manage quality inspections',
        },
      },
      { status: 403 },
    );
  }

  const body = (await request.json()) as {
    id?: string;
    workflowStatus?: string;
    checklistItemId?: string;
    resolveAsPass?: boolean;
  };

  if (!body.id) {
    return Response.json(
      {
        status: 'error',
        error: { code: 'BAD_REQUEST', message: 'id is required' },
      },
      { status: 400 },
    );
  }

  const record = store.inspectionRecords.find((r) => r.id === body.id);

  if (!record) {
    return Response.json(
      {
        status: 'error',
        error: { code: 'NOT_FOUND', message: 'Inspection record not found' },
      },
      { status: 404 },
    );
  }

  const forbidden = requireProjectAccess(record.projectId);
  if (forbidden) return forbidden;

  // --- Resolve checklist item as pass ---
  if (body.checklistItemId && body.resolveAsPass) {
    const item = record.checklist.find((c) => c.id === body.checklistItemId);

    if (!item) {
      return Response.json(
        {
          status: 'error',
          error: { code: 'NOT_FOUND', message: 'Checklist item not found' },
        },
        { status: 404 },
      );
    }

    item.result = 'pass';
    item.note = `${item.note} → แก้ไขแล้ว โดย ${currentUser?.name ?? 'วิศวกร'}`;

    // Recalculate overall result if all items now pass
    const allPass = record.checklist.every((c) => c.result === 'pass');
    if (allPass) {
      record.overallResult = 'pass';
      record.failReason = '';
      record.autoNCR = false;
      removeAutoNcrIssuesForInspection(issueStore, record.id);
    }

    synchronizeItpStatuses(store);

    return Response.json({ status: 'success', data: record });
  }

  // --- Workflow status transition ---
  if (!body.workflowStatus) {
    return Response.json(
      {
        status: 'error',
        error: { code: 'BAD_REQUEST', message: 'workflowStatus or checklistItemId is required' },
      },
      { status: 400 },
    );
  }

  // Block workflow transitions if there are still failed items
  if (body.workflowStatus === 'confirmed' || body.workflowStatus === 'signed') {
    const hasFails = record.checklist.some((c) => c.result === 'fail');
    if (hasFails) {
      return Response.json(
        {
          status: 'error',
          error: {
            code: 'BAD_REQUEST',
            message: 'ไม่สามารถยืนยันหรือลงนามได้ — ยังมีรายการที่ไม่ผ่าน ต้องแก้ไขก่อน',
          },
        },
        { status: 400 },
      );
    }
  }

  const currentStatus = record.workflowStatus ?? 'draft';
  const transitionKey = `${currentStatus}→${body.workflowStatus}`;

  if (!VALID_TRANSITIONS[transitionKey]) {
    return Response.json(
      {
        status: 'error',
        error: {
          code: 'BAD_REQUEST',
          message: `ไม่สามารถเปลี่ยนสถานะจาก "${currentStatus}" เป็น "${body.workflowStatus}" ได้`,
        },
      },
      { status: 400 },
    );
  }

  record.workflowStatus = body.workflowStatus as 'draft' | 'confirmed' | 'signed';

  return Response.json({ status: 'success', data: record });
}

export async function DELETE(request: Request) {
  await new Promise((resolve) => setTimeout(resolve, 150));

  const currentUser = getCurrentApiUser();

  if (!currentUser || !canManageQuality(currentUser.role)) {
    return Response.json(
      {
        status: 'error',
        error: {
          code: 'FORBIDDEN',
          message: 'Only project managers, engineers, or system admins can manage quality inspections',
        },
      },
      { status: 403 },
    );
  }

  const body = (await request.json()) as { id?: string };

  if (!body.id) {
    return Response.json(
      {
        status: 'error',
        error: { code: 'BAD_REQUEST', message: 'id is required' },
      },
      { status: 400 },
    );
  }

  const index = store.inspectionRecords.findIndex((record) => record.id === body.id);

  if (index === -1) {
    return Response.json(
      {
        status: 'error',
        error: { code: 'NOT_FOUND', message: 'Inspection record not found' },
      },
      { status: 404 },
    );
  }

  const record = store.inspectionRecords[index];
  const forbidden = requireProjectAccess(record.projectId);
  if (forbidden) return forbidden;

  store.inspectionRecords.splice(index, 1);
  removeAutoNcrIssuesForInspection(issueStore, record.id);

  synchronizeItpStatuses(store);

  return Response.json({ status: 'success', data: { id: record.id } });
}
