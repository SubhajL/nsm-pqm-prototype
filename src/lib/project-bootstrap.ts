import dayjs from 'dayjs';

import seedDocuments from '@/data/documents.json';
import { getBoqStore } from '@/lib/boq-store';
import { getChangeRequestStore } from '@/lib/change-request-store';
import { getDailyReportStore } from '@/lib/daily-report-store';
import { createEmptyDocumentData, getDocumentStore } from '@/lib/document-store';
import { ensureEvmProjectInitialized, getEvmStore } from '@/lib/evm-store';
import { getGanttStore } from '@/lib/gantt-store';
import { getIssueStore } from '@/lib/issue-store';
import { getMilestoneStore } from '@/lib/milestone-store';
import { getQualityGateStore } from '@/lib/quality-gate-store';
import { getQualityStore } from '@/lib/quality-store';
import { getRiskStore } from '@/lib/risk-store';
import { getWbsStore } from '@/lib/wbs-store';
import type { DocumentData } from '@/types/document';
import type { GanttData, GanttTask } from '@/types/gantt';
import type { Milestone, Project, ProjectType } from '@/types/project';
import type { ITPItem, QualityGate } from '@/types/quality';

interface WbsNode {
  id: string;
  projectId: string;
  parentId: string | null;
  code: string;
  name: string;
  weight: number;
  progress: number;
  level: number;
  hasBOQ: boolean;
}

export interface NewProjectMilestoneInput {
  milestone: number;
  amount: number;
  percentage: number;
  deliverable: string;
}

interface BootstrapProjectDataOptions {
  project: Project;
  milestones: NewProjectMilestoneInput[];
}

const DEFAULT_DOCUMENT_CHILD_FOLDERS = [
  'สัญญาและ TOR',
  'แผนงานและงวดงาน',
  'แบบและขอบเขตงาน',
  'รายงานประจำวัน',
  'เอกสารคุณภาพ',
  'งบประมาณและ EVM',
  'เอกสารส่งมอบ',
] as const;

type QualityGateTemplate = Pick<QualityGate, 'number' | 'name' | 'nameEn'>;
type ITPTemplate = Pick<ITPItem, 'item' | 'standard' | 'inspectionType'>;

function getDefaultMilestones(project: Project): NewProjectMilestoneInput[] {
  return [
    {
      milestone: 1,
      amount: project.budget,
      percentage: 100,
      deliverable: 'ส่งมอบโครงการทั้งหมด',
    },
  ];
}

function getMilestoneInputs(project: Project, inputs: NewProjectMilestoneInput[]) {
  return inputs.length > 0 ? inputs : getDefaultMilestones(project);
}

function getMilestoneName(input: NewProjectMilestoneInput) {
  return `งวดที่ ${input.milestone} (${input.percentage}%)`;
}

function getDeliverableLabel(input: NewProjectMilestoneInput) {
  const raw = input.deliverable.trim();
  if (!raw) {
    return `งวดที่ ${input.milestone}`;
  }

  const parts = raw.split(':');
  if (parts.length > 1) {
    return parts.slice(1).join(':').trim() || raw;
  }

  return raw;
}

function buildMilestoneDueDates(project: Project, inputs: NewProjectMilestoneInput[]) {
  const start = dayjs(project.startDate);
  const end = dayjs(project.endDate);
  const totalDays = Math.max(end.diff(start, 'day'), 0);

  let cumulativePercent = 0;

  return inputs.map((input, index) => {
    cumulativePercent += input.percentage;

    if (index === inputs.length - 1) {
      return project.endDate;
    }

    const offset = Math.round((totalDays * Math.min(cumulativePercent, 100)) / 100);
    return start.add(offset, 'day').format('YYYY-MM-DD');
  });
}

function buildMilestones(project: Project, inputs: NewProjectMilestoneInput[]) {
  const dueDates = buildMilestoneDueDates(project, inputs);

  return inputs.map<Milestone>((input, index) => ({
    id: `ms-${project.id}-${String(index + 1).padStart(2, '0')}`,
    projectId: project.id,
    number: input.milestone,
    name: getMilestoneName(input),
    dueDate: dueDates[index],
    amount: input.amount,
    percentage: input.percentage,
    deliverables: input.deliverable,
    status: 'pending',
  }));
}

function buildWbsNodes(project: Project, inputs: NewProjectMilestoneInput[]) {
  return inputs.map<WbsNode>((input, index) => ({
    id: `wbs-${project.id}-${String(index + 1).padStart(2, '0')}`,
    projectId: project.id,
    parentId: null,
    code: `${index + 1}.0`,
    name: getDeliverableLabel(input),
    weight: input.percentage,
    progress: 0,
    level: 1,
    hasBOQ: false,
  }));
}

function buildGanttData(project: Project, milestones: Milestone[]): GanttData {
  const start = dayjs(project.startDate);
  let segmentStart = start;
  let nextId = 1;
  const data: GanttTask[] = [];

  milestones.forEach((milestone) => {
    const segmentEnd = dayjs(milestone.dueDate);
    const groupId = nextId++;
    const duration = Math.max(segmentEnd.diff(segmentStart, 'day') + 1, 1);

    data.push({
      id: groupId,
      text: milestone.name,
      start_date: segmentStart.format('YYYY-MM-DD'),
      end_date: segmentEnd.format('YYYY-MM-DD'),
      duration,
      progress: 0,
      parent: 0,
      type: 'project',
      owner: '',
    });

    data.push({
      id: nextId++,
      text: `ตรวจรับงวด ${milestone.number}`,
      start_date: milestone.dueDate,
      end_date: milestone.dueDate,
      duration: 0,
      progress: 0,
      parent: groupId,
      type: 'milestone',
      owner: '',
    });

    segmentStart = segmentEnd.add(1, 'day');
  });

  return { data, links: [] };
}

function buildDocumentData(project: Project): DocumentData {
  const rootId = `folder-${project.id}-root`;
  const permissions = (seedDocuments as DocumentData).permissions.map((permission) => ({
    ...permission,
  }));

  return {
    ...createEmptyDocumentData(),
    folders: [
      { id: rootId, name: project.name, parentId: null },
      ...DEFAULT_DOCUMENT_CHILD_FOLDERS.map((name, index) => ({
        id: `folder-${project.id}-${index + 1}`,
        name,
        parentId: rootId,
        fileCount: 0,
      })),
    ],
    permissions,
  };
}

function getQualityGateTemplates(type: ProjectType): QualityGateTemplate[] {
  if (type === 'it' || type === 'equipment') {
    return [
      { number: 0, name: 'Requirements', nameEn: 'Requirements Review' },
      { number: 1, name: 'Design', nameEn: 'Design Review' },
      { number: 2, name: 'Build/Test', nameEn: 'Build & Test' },
      { number: 3, name: 'UAT', nameEn: 'User Acceptance Test' },
      { number: 4, name: 'Handover', nameEn: 'Go-Live & Handover' },
    ];
  }

  if (type === 'academic') {
    return [
      { number: 0, name: 'Proposal', nameEn: 'Proposal Approval' },
      { number: 1, name: 'Method', nameEn: 'Method Review' },
      { number: 2, name: 'Fieldwork', nameEn: 'Fieldwork Readiness' },
      { number: 3, name: 'Draft', nameEn: 'Draft Report Review' },
      { number: 4, name: 'Final', nameEn: 'Final Submission' },
    ];
  }

  return [
    { number: 0, name: 'Concept', nameEn: 'Concept Approval' },
    { number: 1, name: 'Design', nameEn: 'Design Review' },
    { number: 2, name: 'Tender', nameEn: 'Tender Readiness' },
    { number: 3, name: 'Execution', nameEn: 'Execution Readiness' },
    { number: 4, name: 'Handover', nameEn: 'Final Handover' },
  ];
}

function getItpTemplates(type: ProjectType): ITPTemplate[] {
  if (type === 'it') {
    return [
      { item: 'ทบทวนความต้องการระบบ', standard: 'SRS / TOR', inspectionType: 'RS' },
      { item: 'ทดสอบระบบและ Unit Test', standard: 'Test Case Matrix', inspectionType: 'W' },
      { item: 'ทดสอบ UAT กับผู้ใช้งาน', standard: 'UAT Checklist', inspectionType: 'H' },
      { item: 'ตรวจรับส่งมอบระบบ', standard: 'Deployment & Handover Checklist', inspectionType: 'H' },
    ];
  }

  if (type === 'equipment') {
    return [
      { item: 'ตรวจสเปกและเอกสารผู้ขาย', standard: 'TOR / Vendor Submittal', inspectionType: 'RS' },
      { item: 'ตรวจรับก่อนติดตั้ง', standard: 'Incoming Inspection Checklist', inspectionType: 'W' },
      { item: 'ทดสอบ Commissioning', standard: 'Commissioning Procedure', inspectionType: 'H' },
      { item: 'ตรวจรับส่งมอบการใช้งาน', standard: 'Acceptance Checklist', inspectionType: 'H' },
    ];
  }

  if (type === 'academic') {
    return [
      { item: 'ทบทวนแผนการดำเนินงานวิชาการ', standard: 'Approved Proposal', inspectionType: 'RS' },
      { item: 'ตรวจความพร้อมเก็บข้อมูล', standard: 'Fieldwork Checklist', inspectionType: 'W' },
      { item: 'ตรวจร่างรายงานฉบับกลาง', standard: 'Review Comment Sheet', inspectionType: 'RS' },
      { item: 'ตรวจรับรายงานฉบับสมบูรณ์', standard: 'Final Deliverable Checklist', inspectionType: 'H' },
    ];
  }

  return [
    { item: 'ตรวจแบบและวัสดุอ้างอิง', standard: 'Approved Drawing / Material Submittal', inspectionType: 'RS' },
    { item: 'ตรวจความพร้อมก่อนเริ่มงาน', standard: 'Pre-Start Checklist', inspectionType: 'W' },
    { item: 'ตรวจงานระหว่างก่อสร้าง/ติดตั้ง', standard: 'ITP / Method Statement', inspectionType: 'H' },
    { item: 'ตรวจรับก่อนส่งมอบ', standard: 'Punch List & Acceptance Checklist', inspectionType: 'H' },
  ];
}

function buildQualityGates(project: Project) {
  return getQualityGateTemplates(project.type).map<QualityGate>((template) => ({
    id: `gate-${project.id}-${template.number}`,
    projectId: project.id,
    number: template.number,
    name: template.name,
    nameEn: template.nameEn,
    status: 'pending',
    date: null,
  }));
}

function buildItpItems(project: Project) {
  return getItpTemplates(project.type).map<ITPItem>((template, index) => ({
    id: `itp-${project.id}-${index + 1}`,
    projectId: project.id,
    sequence: index + 1,
    item: template.item,
    standard: template.standard,
    inspectionType: template.inspectionType,
    inspector: project.managerName,
    status: 'pending',
  }));
}

export function bootstrapProjectData({
  project,
  milestones: rawMilestones,
}: BootstrapProjectDataOptions) {
  const milestoneInputs = getMilestoneInputs(project, rawMilestones);
  const milestones = buildMilestones(project, milestoneInputs);
  const wbsNodes = buildWbsNodes(project, milestoneInputs);
  const ganttData = buildGanttData(project, milestones);
  const documentData = buildDocumentData(project);
  const qualityGates = buildQualityGates(project);
  const itpItems = buildItpItems(project);

  getBoqStore();
  getDailyReportStore();
  getRiskStore();
  getIssueStore();
  getEvmStore();
  ensureEvmProjectInitialized(project.id);
  getChangeRequestStore();

  const milestoneStore = getMilestoneStore();
  if (!milestoneStore.some((entry) => entry.projectId === project.id)) {
    milestoneStore.push(...milestones);
  }

  const wbsStore = getWbsStore();
  if (!wbsStore.some((entry) => entry.projectId === project.id)) {
    wbsStore.push(...wbsNodes);
  }

  const ganttStore = getGanttStore();
  if (!ganttStore[project.id]) {
    ganttStore[project.id] = ganttData;
  }

  const documentStore = getDocumentStore();
  if (!documentStore[project.id]) {
    documentStore[project.id] = documentData;
  }

  const qualityGateStore = getQualityGateStore();
  if (!qualityGateStore.some((entry) => entry.projectId === project.id)) {
    qualityGateStore.push(...qualityGates);
  }

  const qualityStore = getQualityStore();
  if (!qualityStore.itpItems.some((entry) => entry.projectId === project.id)) {
    qualityStore.itpItems.push(...itpItems);
  }
}
