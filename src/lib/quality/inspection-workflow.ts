import type { InspectionChecklistItem, WorkflowStatus } from '@/types/quality';

export type InspectionTransitionResult =
  | { ok: true; nextStatus: WorkflowStatus }
  | { ok: false; code: 'INVALID_TRANSITION'; message: string }
  | { ok: false; code: 'CHECKLIST_HAS_FAILS'; message: string };

const VALID_TRANSITIONS: Record<WorkflowStatus, readonly WorkflowStatus[]> = {
  draft: ['confirmed'],
  confirmed: ['signed'],
  signed: [],
};

const FORWARD_TARGETS: ReadonlySet<WorkflowStatus> = new Set<WorkflowStatus>([
  'confirmed',
  'signed',
]);

export function transitionInspection(input: {
  from: WorkflowStatus;
  to: WorkflowStatus;
  checklist: ReadonlyArray<Pick<InspectionChecklistItem, 'result'>>;
}): InspectionTransitionResult {
  const { from, to, checklist } = input;

  // Validity-first: a draft → signed skip must surface as INVALID_TRANSITION
  // even when the checklist has fails (pinned by the [id] route test).
  if (!VALID_TRANSITIONS[from].includes(to)) {
    return {
      ok: false,
      code: 'INVALID_TRANSITION',
      message: `ไม่สามารถเปลี่ยนสถานะจาก "${from}" เป็น "${to}" ได้`,
    };
  }

  if (FORWARD_TARGETS.has(to) && checklist.some((c) => c.result === 'fail')) {
    return {
      ok: false,
      code: 'CHECKLIST_HAS_FAILS',
      message: 'ไม่สามารถยืนยันหรือลงนามได้ — ยังมีรายการที่ไม่ผ่าน ต้องแก้ไขก่อน',
    };
  }

  return { ok: true, nextStatus: to };
}
