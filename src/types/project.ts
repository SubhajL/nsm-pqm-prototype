import type {
  ContractingModel,
  DeliveryMethod,
  ProjectSizeTier,
  RidLifecycleStage,
} from '@/types/rid/vocabulary';

export type ProjectType = 'construction' | 'it' | 'equipment' | 'academic' | 'renovation';
export type ProjectStatus = 'draft' | 'planning' | 'in_progress' | 'on_hold' | 'completed' | 'cancelled';
export type ProjectScheduleHealth = 'on_schedule' | 'watch' | 'delayed';

/**
 * Single entry in a project's RID lifecycle history. Appended every time a
 * stage transition is approved via the lifecycle PATCH route. The first entry
 * (auto-generated on project creation / seed migration) is always `planning`
 * with `enteredBy: null`.
 *
 * `artifactDocIds` references `DocumentFile.id` values that were attached as
 * evidence for entering this stage — see `lifecycle-artifacts.ts` for the
 * per-stage requirement table.
 */
export interface LifecycleStageHistoryEntry {
  stage: RidLifecycleStage;
  /** ISO timestamp the stage was entered. */
  enteredAt: string;
  /** Acting user id at transition time; null for the auto-seeded initial entry. */
  enteredBy: string | null;
  /** DocumentFile.id values cited as evidence for entry. */
  artifactDocIds: string[];
}

export interface Project {
  id: string;
  code: string;
  name: string;
  nameEn: string;
  type: ProjectType;
  /**
   * Who actually executes the contracted work.
   *
   * Canonical name as of PR-15 (was `executionModel` pre-PR-15; PR-13
   * already renamed the value set from `'internal' | 'outsourced'` to
   * `'in_house' | 'outsourced' | 'consultant_supervised'`).
   */
  deliveryMethod: DeliveryMethod;
  /**
   * Pricing structure of the awarded contract. `null` indicates the project
   * has not yet been awarded a contract (e.g. in-house work, planning phase,
   * or legacy demo rows without a recorded contracting model).
   */
  contractingModel: ContractingModel | null;
  /**
   * Coarse budget bucket used for approval-authority routing and reporting
   * rollups. Inferred from `budget` via `classifyProjectSize()` at creation
   * time (see `src/lib/project-bootstrap.ts`) but stored explicitly so the
   * tier can be overridden by an administrator without re-deriving from the
   * budget. Default for existing seed rows is `'medium'` per PR-14.
   */
  sizeTier: ProjectSizeTier;
  status: ProjectStatus;
  budget: number;
  progress: number;
  scheduleHealth?: ProjectScheduleHealth;
  startDate: string;
  endDate: string;
  duration: number;
  spiValue: number;
  cpiValue: number;
  managerId: string;
  managerName: string;
  departmentId: string;
  departmentName: string;
  openIssues: number;
  highRisks: number;
  currentMilestone: number;
  totalMilestones: number;
  /**
   * Current RID lifecycle stage (PR-16). Defaults to `'planning'` for rows
   * migrated from pre-PR-16 fixtures.
   *
   * This is the SEPARATE lifecycle-gate state — distinct from the
   * QualityGatePipeline's ITP/inspection gate state. See
   * `src/components/rid/RidLifecycleGates.tsx`.
   */
  currentLifecycleStage: RidLifecycleStage;
  /**
   * Append-only history of lifecycle transitions for this project. Always
   * non-empty (seed migration ensures every row starts with a
   * `planning` entry).
   */
  lifecycleStageHistory: LifecycleStageHistoryEntry[];
}

export interface Milestone {
  id: string;
  projectId: string;
  number: number;
  name: string;
  dueDate: string;
  amount: number;
  percentage: number;
  deliverables: string;
  status: 'pending' | 'in_progress' | 'review' | 'completed';
}

export const PROJECT_TYPE_LABELS: Record<ProjectType, { th: string; en: string }> = {
  construction: { th: 'ก่อสร้าง/ปรับปรุง', en: 'Construction' },
  it: { th: 'พัฒนาระบบ IT', en: 'IT/Software' },
  equipment: { th: 'จัดซื้อครุภัณฑ์', en: 'Equipment' },
  academic: { th: 'วิชาการ', en: 'Academic' },
  renovation: { th: 'ตกแต่งพื้นที่จัดแสดง', en: 'Renovation' },
};

export const DELIVERY_METHOD_LABELS: Record<DeliveryMethod, { th: string; en: string }> = {
  in_house: { th: 'ดำเนินการเอง', en: 'In-House Project' },
  outsourced: { th: 'จ้างเหมา', en: 'Outsourced Project' },
  consultant_supervised: { th: 'ที่ปรึกษากำกับ', en: 'Consultant Supervised' },
};

export const CONTRACTING_MODEL_LABELS: Record<ContractingModel, { th: string; en: string }> = {
  lump_sum: { th: 'เหมารวม', en: 'Lump Sum' },
  unit_price: { th: 'รายการต่อหน่วย', en: 'Unit Price' },
  cost_plus: { th: 'ต้นทุนบวกค่าตอบแทน', en: 'Cost Plus' },
  design_build: { th: 'Design-Build', en: 'Design-Build' },
};

export function getProjectDeliveryMethod(
  project: Pick<Project, 'deliveryMethod'> | undefined,
): DeliveryMethod {
  return project?.deliveryMethod ?? 'in_house';
}

export function isOutsourcedProject(
  project: Pick<Project, 'deliveryMethod'> | undefined,
) {
  return getProjectDeliveryMethod(project) === 'outsourced';
}

import { COLORS } from '@/theme/antd-theme';

export const PROJECT_STATUS_LABELS: Record<ProjectStatus, { th: string; en: string; color: string }> = {
  draft: { th: 'ร่าง', en: 'Draft', color: 'default' },
  planning: { th: 'วางแผน', en: 'Planning', color: COLORS.info },
  in_progress: { th: 'กำลังดำเนินการ', en: 'In Progress', color: 'processing' },
  on_hold: { th: 'หยุดชั่วคราว', en: 'On Hold', color: 'warning' },
  completed: { th: 'เสร็จสิ้น', en: 'Completed', color: 'success' },
  cancelled: { th: 'ยกเลิก', en: 'Cancelled', color: 'error' },
};
