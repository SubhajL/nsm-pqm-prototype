export type ProjectType = 'construction' | 'it' | 'equipment' | 'academic' | 'renovation';
export type ProjectStatus = 'draft' | 'planning' | 'in_progress' | 'on_hold' | 'completed' | 'cancelled';
export type ProjectScheduleHealth = 'on_schedule' | 'watch' | 'delayed';
export type ProjectExecutionModel = 'internal' | 'outsourced';

export interface Project {
  id: string;
  code: string;
  name: string;
  nameEn: string;
  type: ProjectType;
  executionModel: ProjectExecutionModel;
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
  internal: { th: 'โครงการภายใน', en: 'Internal Project' },
  outsourced: { th: 'จ้างภายนอก', en: 'Outsourced Project' },
};

export function getProjectExecutionModel(
  project: Pick<Project, 'executionModel'> | undefined,
): ProjectExecutionModel {
  return project?.executionModel ?? 'internal';
}

export function isOutsourcedProject(
  project: Pick<Project, 'executionModel'> | undefined,
) {
  return getProjectExecutionModel(project) === 'outsourced';
}

export const PROJECT_STATUS_LABELS: Record<ProjectStatus, { th: string; en: string; color: string }> = {
  draft: { th: 'ร่าง', en: 'Draft', color: 'default' },
  planning: { th: 'วางแผน', en: 'Planning', color: '#2D6BFF' },
  in_progress: { th: 'กำลังดำเนินการ', en: 'In Progress', color: 'processing' },
  on_hold: { th: 'หยุดชั่วคราว', en: 'On Hold', color: 'warning' },
  completed: { th: 'เสร็จสิ้น', en: 'Completed', color: 'success' },
  cancelled: { th: 'ยกเลิก', en: 'Cancelled', color: 'error' },
};
