import type { DeliveryMethod, ProjectSizeTier } from '@/types/rid/vocabulary';

export type ProjectType = 'construction' | 'it' | 'equipment' | 'academic' | 'renovation';
export type ProjectStatus = 'draft' | 'planning' | 'in_progress' | 'on_hold' | 'completed' | 'cancelled';
export type ProjectScheduleHealth = 'on_schedule' | 'watch' | 'delayed';

/**
 * Project execution model.
 *
 * @deprecated Renamed to `DeliveryMethod` in `@/types/rid/vocabulary`. The
 * legacy `'internal' | 'outsourced'` union has been replaced by
 * `'in_house' | 'outsourced' | 'consultant_supervised'` (PR-13, MVP plan).
 * This alias is retained for one release for back-compat — migrate new
 * callers to `DeliveryMethod` directly.
 */
export type ProjectExecutionModel = DeliveryMethod;

export interface Project {
  id: string;
  code: string;
  name: string;
  nameEn: string;
  type: ProjectType;
  executionModel: ProjectExecutionModel;
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

export const PROJECT_EXECUTION_MODEL_LABELS: Record<ProjectExecutionModel, { th: string; en: string }> = {
  in_house: { th: 'ดำเนินการเอง', en: 'In-House Project' },
  outsourced: { th: 'จ้างเหมา', en: 'Outsourced Project' },
  consultant_supervised: { th: 'ที่ปรึกษากำกับ', en: 'Consultant Supervised' },
};

export function getProjectExecutionModel(
  project: Pick<Project, 'executionModel'> | undefined,
): ProjectExecutionModel {
  return project?.executionModel ?? 'in_house';
}

export function isOutsourcedProject(
  project: Pick<Project, 'executionModel'> | undefined,
) {
  return getProjectExecutionModel(project) === 'outsourced';
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
