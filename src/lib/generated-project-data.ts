import seedProjects from '@/data/projects.json';
import seedUsers from '@/data/users.json';
import seedMemberships from '@/data/project-memberships.json';
import { normalizeProjectWbsProgress } from '@/lib/wbs-progress-normalization';
import type { Project, Milestone } from '@/types/project';
import type { DailyReport } from '@/types/daily-report';
import type { Issue, Risk } from '@/types/risk';
import type { QualityGate, InspectionsData, InspectionRecord, ITPItem } from '@/types/quality';
import type { DocumentData, DocumentFile, Folder, VersionEntry, ChangeRequest, PermissionEntry } from '@/types/document';
import type { EVMDataPoint } from '@/types/evm';
import type { GanttData, GanttTask } from '@/types/gantt';

interface WBSNode {
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

interface BOQItem {
  id: string;
  wbsId: string;
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  total: number;
}

type ProjectAssignmentRole =
  | 'manager'
  | 'engineer'
  | 'coordinator'
  | 'team_member'
  | 'consultant';

interface UserSeed {
  id: string;
  name: string;
}

interface MembershipSeed {
  projectId: string;
  userId: string;
  assignmentRole: ProjectAssignmentRole;
}

interface ScenarioBoqItem {
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
}

interface ScenarioChildTask {
  code: string;
  name: string;
  weight: number;
  progress: number;
  hasBOQ?: boolean;
  owner?: string;
  boq?: ScenarioBoqItem[];
}

interface ScenarioPhase {
  code: string;
  name: string;
  weight: number;
  progress: number;
  durationDays: number;
  children: ScenarioChildTask[];
}

interface ScenarioReport {
  reportNumber: number;
  date: string;
  weather: string;
  temperature: number;
  linkedWbsCodes: string[];
  activities: Array<{
    wbsCode?: string;
    task: string;
    quantity: number;
    unit: string;
    cumulativeProgress: number;
  }>;
  issues: string;
  status: DailyReport['status'];
}

interface ScenarioIssue {
  title: string;
  severity: Issue['severity'];
  status: Issue['status'];
  linkedWbs: string;
  slaHours: number;
  createdAt: string;
  assignee?: string;
  resolution?: string;
  progress?: number;
  tags?: string[];
  closedAt?: string | null;
}

interface ScenarioRisk {
  title: string;
  description: string;
  likelihood: number;
  impact: number;
  status: Risk['status'];
  owner?: string;
  dateIdentified: string;
  mitigation: string;
}

interface ScenarioGate {
  number: number;
  name: string;
  nameEn: string;
  status: QualityGate['status'];
  date: string | null;
  checklist?: QualityGate['checklist'];
}

interface ScenarioItp {
  sequence: number;
  item: string;
  standard: string;
  inspectionType: ITPItem['inspectionType'];
  inspector: string;
  status: ITPItem['status'];
}

interface ScenarioInspection {
  title: string;
  itpSequence: number;
  date: string;
  time: string;
  wbsCode: string;
  standards: string[];
  overallResult: 'pass' | 'conditional';
  failReason?: string;
  checklist: InspectionRecord['checklist'];
}

interface ScenarioDocument {
  folder: string;
  name: string;
  type: string;
  version: number;
  size: string;
  uploadedBy?: string;
  uploadedAt: string;
  status: DocumentFile['status'];
  workflow: string[];
  history?: VersionEntry[];
}

interface ScenarioChangeRequest {
  id: string;
  title: string;
  reason: string;
  budgetImpact: number;
  scheduleImpact: number;
  linkedWbs: string;
  priority: ChangeRequest['priority'];
  status: ChangeRequest['status'];
  requestedBy?: string;
  requestedAt: string;
  approvedBy?: string | null;
  approvedAt?: string | null;
  attachments: string[];
  workflow: ChangeRequest['workflow'];
}

interface ScenarioEvmPoint {
  month: string;
  pv: number;
  ev: number;
  ac: number;
  paidToDate?: number;
}

interface ScenarioConfig {
  phases: ScenarioPhase[];
  milestones: Array<Omit<Milestone, 'id' | 'projectId' | 'amount'>>;
  reports: ScenarioReport[];
  issues: ScenarioIssue[];
  risks: ScenarioRisk[];
  gates: ScenarioGate[];
  itpItems: ScenarioItp[];
  inspections: ScenarioInspection[];
  documents: {
    folders: string[];
    files: ScenarioDocument[];
  };
  changeRequests: ScenarioChangeRequest[];
  evm: ScenarioEvmPoint[];
}

const projects = seedProjects as Project[];
const users = seedUsers as UserSeed[];
const memberships = seedMemberships as MembershipSeed[];

const usersById = new Map(users.map((user) => [user.id, user]));

const DOCUMENT_PERMISSIONS: PermissionEntry[] = [
  { role: 'ผจก.โครงการ (PM)', upload: true, download: true, edit: true, delete: true, manageFolder: true },
  { role: 'วิศวกร (Engineer)', upload: true, download: true, edit: true, delete: false, manageFolder: false },
  { role: 'ผู้ประสานงาน (Coordinator)', upload: true, download: true, edit: true, delete: false, manageFolder: false },
  { role: 'ผู้สังเกตการณ์ (Viewer)', upload: false, download: true, edit: false, delete: false, manageFolder: false },
];

function getProject(projectId: string) {
  const project = projects.find((entry) => entry.id === projectId);
  if (!project) {
    throw new Error(`Missing project seed for ${projectId}`);
  }
  return project;
}

function getMemberName(projectId: string, assignmentRole: ProjectAssignmentRole, fallback: string) {
  const membership = memberships.find(
    (entry) => entry.projectId === projectId && entry.assignmentRole === assignmentRole,
  );
  if (!membership) {
    return fallback;
  }
  return usersById.get(membership.userId)?.name ?? fallback;
}

function getProjectContacts(project: Project) {
  const manager = project.managerName;
  const engineer = getMemberName(project.id, 'engineer', manager);
  const coordinator = getMemberName(project.id, 'coordinator', manager);
  const consultant = getMemberName(project.id, 'consultant', manager);
  const teamMember = getMemberName(project.id, 'team_member', coordinator);

  return { manager, engineer, coordinator, consultant, teamMember };
}

function formatMonthThai(month: string) {
  const thaiMonths = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
  const [year, monthPart] = month.split('-').map(Number);
  const shortYear = ((year ?? 2026) + 543) % 100;
  return `${thaiMonths[(monthPart ?? 1) - 1]} ${shortYear}`;
}

function buildWbsNodes(project: Project, scenario: ScenarioConfig): WBSNode[] {
  const rootId = `wbs-${project.id}-root`;
  const root: WBSNode = {
    id: rootId,
    projectId: project.id,
    parentId: null,
    code: project.code,
    name: project.name,
    weight: 100,
    progress: Math.round(project.progress * 100),
    level: 0,
    hasBOQ: false,
  };

  const nodes: WBSNode[] = [root];

  for (const phase of scenario.phases) {
    const phaseId = `wbs-${project.id}-${phase.code.replace(/\./g, '-')}`;
    nodes.push({
      id: phaseId,
      projectId: project.id,
      parentId: rootId,
      code: phase.code,
      name: phase.name,
      weight: phase.weight,
      progress: phase.progress,
      level: 1,
      hasBOQ: false,
    });

    for (const child of phase.children) {
      nodes.push({
        id: `wbs-${project.id}-${child.code.replace(/\./g, '-')}`,
        projectId: project.id,
        parentId: phaseId,
        code: child.code,
        name: child.name,
        weight: child.weight,
        progress: child.progress,
        level: 2,
        hasBOQ: Boolean(child.hasBOQ),
      });
    }
  }

  return normalizeProjectWbsProgress(nodes);
}

function getWeightedPhaseProgress(phase: ScenarioPhase) {
  if (phase.children.length === 0) {
    return 0;
  }

  const totalWeight = phase.children.reduce((sum, child) => sum + child.weight, 0);
  if (totalWeight <= 0) {
    return (
      phase.children.reduce((sum, child) => sum + child.progress, 0) /
      phase.children.length
    );
  }

  return (
    phase.children.reduce(
      (sum, child) => sum + child.progress * child.weight,
      0,
    ) / totalWeight
  );
}

function buildBoqItems(project: Project, scenario: ScenarioConfig): BOQItem[] {
  const boqItems: BOQItem[] = [];

  scenario.phases.forEach((phase) => {
    phase.children.forEach((child, index) => {
      if (!child.hasBOQ || !child.boq) {
        return;
      }

      child.boq.forEach((item, boqIndex) => {
        boqItems.push({
          id: `boq-${project.id}-${index + 1}-${boqIndex + 1}`,
          wbsId: `wbs-${project.id}-${child.code.replace(/\./g, '-')}`,
          description: item.description,
          quantity: item.quantity,
          unit: item.unit,
          unitPrice: item.unitPrice,
          total: item.quantity * item.unitPrice,
        });
      });
    });
  });

  return boqItems;
}

function buildGanttData(project: Project, scenario: ScenarioConfig): GanttData {
  const tasks: GanttTask[] = [];
  let taskId = 2000 + Number(project.id.slice(-3)) * 100;
  const links: GanttData['links'] = [];
  let linkId = taskId;
  let cursorDate = new Date(project.startDate);

  scenario.phases.forEach((phase, phaseIndex) => {
    const phaseId = taskId++;
    const phaseStart = new Date(cursorDate);
    const phaseEnd = new Date(cursorDate);
    phaseEnd.setDate(phaseEnd.getDate() + phase.durationDays);
    const phaseProgressRatio = getWeightedPhaseProgress(phase) / 100;

    const baselinePhaseStart = phaseStart.toISOString().slice(0, 10);
    const baselinePhaseEnd = phaseEnd.toISOString().slice(0, 10);

    tasks.push({
      id: phaseId,
      text: phase.name,
      start_date: baselinePhaseStart,
      end_date: baselinePhaseEnd,
      duration: phase.durationDays,
      progress: phaseProgressRatio,
      parent: 0,
      type: 'project',
      owner: '',
      baseline_start_date: baselinePhaseStart,
      baseline_end_date: baselinePhaseEnd,
    });

    let childCursor = new Date(phaseStart);
    phase.children.forEach((child, childIndex) => {
      const childId = taskId++;
      const childDuration = Math.max(Math.round(phase.durationDays / Math.max(phase.children.length, 1)), 5);
      const childEnd = new Date(childCursor);
      childEnd.setDate(childEnd.getDate() + childDuration);

      const actualStart = childCursor.toISOString().slice(0, 10);
      const actualEnd = childEnd.toISOString().slice(0, 10);
      // Baseline dates are slightly earlier to show plan-vs-actual gap
      const baselineShift = child.progress > 0 && child.progress < 100 ? 3 : 0;
      const blStart = new Date(childCursor);
      blStart.setDate(blStart.getDate() - baselineShift);
      const blEnd = new Date(childEnd);
      blEnd.setDate(blEnd.getDate() - baselineShift);

      tasks.push({
        id: childId,
        text: child.name,
        start_date: actualStart,
        end_date: actualEnd,
        duration: childDuration,
        progress: child.progress / 100,
        parent: phaseId,
        type: 'task',
        owner: child.owner ?? '',
        baseline_start_date: blStart.toISOString().slice(0, 10),
        baseline_end_date: blEnd.toISOString().slice(0, 10),
      });

      if (childIndex > 0) {
        links.push({
          id: linkId++,
          source: childId - 1,
          target: childId,
          type: 'FS',
          lagDays: 0,
        });
      }

      childCursor = new Date(childEnd);
      childCursor.setDate(childCursor.getDate() + 1);
    });

    const milestoneId = taskId++;
    tasks.push({
      id: milestoneId,
      text: scenario.milestones[phaseIndex]?.name ?? `Milestone ${phaseIndex + 1}`,
      start_date: phaseEnd.toISOString().slice(0, 10),
      end_date: phaseEnd.toISOString().slice(0, 10),
      duration: 1,
      progress: phaseProgressRatio >= 1 ? 1 : 0,
      parent: phaseId,
      type: 'milestone',
      owner: '',
      baseline_start_date: baselinePhaseEnd,
      baseline_end_date: baselinePhaseEnd,
    });

    if (phaseIndex > 0) {
      links.push({
        id: linkId++,
        source: tasks[tasks.length - phase.children.length - 2].id,
        target: phaseId,
        type: 'FS',
        lagDays: 0,
      });
    }

    cursorDate = new Date(phaseEnd);
    cursorDate.setDate(cursorDate.getDate() + 1);
  });

  return { data: tasks, links };
}

function deriveMilestoneStatusFromPhaseProgress(progress: number): Milestone['status'] {
  if (progress >= 1) {
    return 'completed';
  }

  return progress > 0 ? 'in_progress' : 'pending';
}

function buildMilestones(project: Project, scenario: ScenarioConfig): Milestone[] {
  const ganttData = buildGanttData(project, scenario);
  const phaseTasks = ganttData.data
    .filter((task) => task.parent === 0 && task.type === 'project')
    .sort((left, right) => left.start_date.localeCompare(right.start_date));

  return scenario.milestones.map((milestone, index) => {
    const matchedPhase = phaseTasks[index];
    const milestoneStatus = matchedPhase
      ? deriveMilestoneStatusFromPhaseProgress(matchedPhase.progress)
      : milestone.status;

    return {
      id: `ms-${project.id}-${index + 1}`,
      projectId: project.id,
      number: milestone.number,
      name: milestone.name,
      dueDate: matchedPhase?.end_date ?? milestone.dueDate,
      amount: Math.round((project.budget * milestone.percentage) / 100),
      percentage: milestone.percentage,
      deliverables: milestone.deliverables,
      status: milestoneStatus,
    };
  });
}

function resolveWbsId(projectId: string, wbsCode: string | undefined) {
  if (!wbsCode) {
    return undefined;
  }

  return `wbs-${projectId}-${wbsCode.replace(/\./g, '-')}`;
}

function buildDailyReportStatusHistory(
  projectId: string,
  index: number,
  report: ScenarioReport,
  contacts: ReturnType<typeof getProjectContacts>,
): DailyReport['statusHistory'] {
  const reporterTimestamp = `${report.date}T16:30:00`;
  const reviewerTimestamp = `${report.date}T17:00:00`;
  const history: DailyReport['statusHistory'] = [
    {
      id: `dr-history-${projectId}-${index + 1}-draft`,
      status: 'draft',
      actorName: contacts.coordinator,
      actorRole: 'Coordinator',
      timestamp: reporterTimestamp,
      note: 'สร้างรายงานประจำวัน',
    },
  ];

  if (report.status === 'submitted' || report.status === 'approved' || report.status === 'rejected') {
    history.push({
      id: `dr-history-${projectId}-${index + 1}-submitted`,
      status: 'submitted',
      actorName: contacts.coordinator,
      actorRole: 'Coordinator',
      timestamp: reviewerTimestamp,
      note: 'ส่งรายงานเพื่อตรวจสอบ',
    });
  }

  if (report.status === 'approved' || report.status === 'rejected') {
    history.push({
      id: `dr-history-${projectId}-${index + 1}-${report.status}`,
      status: report.status,
      actorName: contacts.manager,
      actorRole: 'Project Manager',
      timestamp: `${report.date}T17:30:00`,
      note: report.status === 'approved' ? 'อนุมัติรายงาน' : 'ตีกลับเพื่อแก้ไข',
    });
  }

  return history;
}

function buildDailyReports(project: Project, scenario: ScenarioConfig): DailyReport[] {
  const contacts = getProjectContacts(project);

  return scenario.reports.map((report, index) => ({
    id: `dr-${project.id}-${index + 1}`,
    projectId: project.id,
    reportNumber: report.reportNumber,
    date: report.date,
    weather: report.weather,
    temperature: report.temperature,
    linkedWbs: report.linkedWbsCodes.map((code) => resolveWbsId(project.id, code) ?? code),
    personnel: [
      { type: 'วิศวกร (Engineer)', count: contacts.engineer === contacts.manager ? 1 : 2 },
      { type: 'ผู้ประสานงาน (Coordinator)', count: contacts.coordinator === contacts.manager ? 1 : 2 },
      { type: project.type === 'academic' ? 'นักวิจัยภาคสนาม (Field Researcher)' : 'คนงานทั่วไป (General)', count: project.type === 'academic' ? 4 : 8 },
    ],
    totalPersonnel: project.type === 'academic' ? 7 : 12,
    activities: report.activities.map((activity) => ({
      wbsId: resolveWbsId(project.id, activity.wbsCode),
      task: activity.task,
      quantity: activity.quantity,
      unit: activity.unit,
      cumulativeProgress: activity.cumulativeProgress,
    })),
    photos: [
      {
        id: `ph-${project.id}-${index + 1}-1`,
        filename: `${project.id}-report-${index + 1}-1.jpg`,
        gpsLat: 14.0784 + index * 0.0003,
        gpsLng: 100.6014 + index * 0.0002,
        timestamp: `${report.date}T09:30:00`,
      },
      {
        id: `ph-${project.id}-${index + 1}-2`,
        filename: `${project.id}-report-${index + 1}-2.jpg`,
        gpsLat: 14.0785 + index * 0.0002,
        gpsLng: 100.6016 + index * 0.0001,
        timestamp: `${report.date}T14:00:00`,
      },
    ],
    attachments: [],
    issues: report.issues,
    signatures: {
      reporter: {
        name: contacts.coordinator,
        signed: report.status !== 'draft',
        timestamp: report.status !== 'draft' ? `${report.date}T16:30:00` : null,
      },
      inspector: {
        name: report.status === 'approved' ? contacts.manager : '',
        signed: report.status === 'approved',
        timestamp: report.status === 'approved' ? `${report.date}T17:00:00` : null,
      },
    },
    status: report.status,
    statusHistory: buildDailyReportStatusHistory(project.id, index, report, contacts),
  }));
}

function buildIssues(project: Project, scenario: ScenarioConfig): Issue[] {
  const contacts = getProjectContacts(project);

  return scenario.issues.map((issue, index) => ({
    id: `ISS-${project.id.slice(-3)}-${String(index + 1).padStart(2, '0')}`,
    projectId: project.id,
    title: issue.title,
    severity: issue.severity,
    status: issue.status,
    assignee: issue.assignee ?? contacts.engineer,
    linkedWbs: issue.linkedWbs,
    slaHours: issue.slaHours,
    resolution: issue.resolution,
    progress: issue.progress,
    tags: issue.tags,
    createdAt: issue.createdAt,
    closedAt: issue.closedAt ?? (issue.status === 'closed' ? issue.createdAt : null),
  }));
}

function buildRisks(project: Project, scenario: ScenarioConfig): Risk[] {
  const contacts = getProjectContacts(project);

  return scenario.risks.map((risk, index) => {
    const score = risk.likelihood * risk.impact;
    const level: Risk['level'] =
      score >= 15 ? 'critical' : score >= 10 ? 'high' : score >= 6 ? 'medium' : 'low';

    return {
      id: `R-${project.id.slice(-3)}-${String(index + 1).padStart(2, '0')}`,
      projectId: project.id,
      title: risk.title,
      description: risk.description,
      likelihood: risk.likelihood,
      impact: risk.impact,
      score,
      level,
      status: risk.status,
      owner: risk.owner ?? contacts.manager,
      dateIdentified: risk.dateIdentified,
      mitigation: risk.mitigation,
    };
  });
}

function buildQualityGates(project: Project, scenario: ScenarioConfig): QualityGate[] {
  return scenario.gates.map((gate) => ({
    id: `gate-${project.id}-${gate.number}`,
    projectId: project.id,
    number: gate.number,
    name: gate.name,
    nameEn: gate.nameEn,
    status: gate.status,
    date: gate.date,
    checklist: gate.checklist,
  }));
}

function buildInspectionData(project: Project, scenario: ScenarioConfig): InspectionsData {
  const contacts = getProjectContacts(project);

  const itpItems = scenario.itpItems.map((item) => ({
    id: `itp-${project.id}-${item.sequence}`,
    projectId: project.id,
    sequence: item.sequence,
    item: item.item,
    standard: item.standard,
    inspectionType: item.inspectionType,
    inspector: item.inspector,
    status: item.status,
  }));

  const inspectionRecords = scenario.inspections.map((record, index) => ({
    id: `insp-${project.id}-${index + 1}`,
    projectId: project.id,
    itpId: `itp-${project.id}-${record.itpSequence}`,
    title: record.title,
    date: record.date,
    time: record.time,
    inspectors: [contacts.manager, contacts.consultant].filter(Boolean),
    wbsLink: record.wbsCode,
    standards: record.standards,
    checklist: record.checklist,
    overallResult: record.overallResult,
    failReason: record.failReason ?? '',
    autoNCR: record.overallResult === 'conditional',
    workflowStatus: record.overallResult === 'pass' ? 'signed' as const : 'draft' as const,
  }));

  return { itpItems, inspectionRecords };
}

function buildDocumentData(project: Project, scenario: ScenarioConfig): DocumentData {
  const contacts = getProjectContacts(project);
  const rootFolderId = `folder-${project.id}-root`;
  const folderLookup = new Map<string, string>();

  const folders: Folder[] = [
    {
      id: rootFolderId,
      name: project.name,
      parentId: null,
    },
    ...scenario.documents.folders.map((folderName, index) => {
      const folderId = `folder-${project.id}-${index + 1}`;
      folderLookup.set(folderName, folderId);
      return {
        id: folderId,
        name: folderName,
        parentId: rootFolderId,
      };
    }),
  ];

  const files: DocumentFile[] = scenario.documents.files.map((file, index) => ({
    id: `file-${project.id}-${index + 1}`,
    folderId: folderLookup.get(file.folder) ?? rootFolderId,
    name: file.name,
    type: file.type,
    version: file.version,
    size: file.size,
    uploadedBy: file.uploadedBy ?? contacts.manager,
    uploadedAt: file.uploadedAt,
    status: file.status,
    workflow: file.workflow,
  }));

  folders.forEach((folder) => {
    if (folder.parentId === rootFolderId) {
      folder.fileCount = files.filter((file) => file.folderId === folder.id).length;
      folder.pendingCount = files.filter(
        (file) => file.folderId === folder.id && file.status === 'under_review',
      ).length;
    }
  });

  const versionHistory = files.reduce<Record<string, VersionEntry[]>>((acc, file, index) => {
    const scenarioFile = scenario.documents.files[index];
    if (scenarioFile.history) {
      acc[file.id] = scenarioFile.history;
    }
    return acc;
  }, {});

  return {
    folders,
    files,
    versionHistory,
    permissions: DOCUMENT_PERMISSIONS,
  };
}

function buildChangeRequests(project: Project, scenario: ScenarioConfig): ChangeRequest[] {
  const contacts = getProjectContacts(project);

  return scenario.changeRequests.map((request) => ({
    id: request.id,
    projectId: project.id,
    title: request.title,
    reason: request.reason,
    budgetImpact: request.budgetImpact,
    scheduleImpact: request.scheduleImpact,
    linkedWbs: request.linkedWbs,
    priority: request.priority,
    status: request.status,
    requestedBy: request.requestedBy ?? contacts.manager,
    requestedAt: request.requestedAt,
    approvedBy: request.approvedBy ?? (request.status === 'approved' ? contacts.manager : null),
    approvedAt: request.approvedAt ?? null,
    attachments: request.attachments,
    workflow: request.workflow,
  }));
}

function buildEvmData(project: Project, scenario: ScenarioConfig): EVMDataPoint[] {
  return scenario.evm.map((point, index) => ({
    id: `evm-${project.id}-${index + 1}`,
    projectId: project.id,
    month: point.month,
    monthThai: formatMonthThai(point.month),
    pv: point.pv,
    ev: point.ev,
    ac: point.paidToDate ?? point.ac,
    paidToDate: point.paidToDate,
    spi: point.pv > 0 ? point.ev / point.pv : 0,
    cpi: (point.paidToDate ?? point.ac) > 0 ? point.ev / (point.paidToDate ?? point.ac) : 0,
  }));
}

const generatedProjectScenarios: Record<string, ScenarioConfig> = {
  'proj-002': {
    phases: [
      {
        code: '1.0',
        name: 'วิเคราะห์ความต้องการ',
        weight: 20,
        progress: 100,
        durationDays: 35,
        children: [
          { code: '1.1', name: 'เก็บความต้องการผู้ใช้', weight: 50, progress: 100, owner: 'น.ส.สมศรี วรรณดี' },
          { code: '1.2', name: 'ออกแบบ UX/UI และ Prototype', weight: 50, progress: 85, owner: 'นายกิตติ คงเจริญ' },
        ],
      },
      {
        code: '2.0',
        name: 'พัฒนาระบบหลัก',
        weight: 40,
        progress: 55,
        durationDays: 70,
        children: [
          {
            code: '2.1',
            name: 'พัฒนา Booking API และฐานข้อมูล',
            weight: 55,
            progress: 60,
            owner: 'นายกิตติ คงเจริญ',
            hasBOQ: true,
            boq: [
              { description: 'ค่าพัฒนา Backend Module', quantity: 1, unit: 'งาน', unitPrice: 850000 },
              { description: 'ค่าบริการ Cloud Sandbox', quantity: 6, unit: 'เดือน', unitPrice: 18000 },
            ],
          },
          {
            code: '2.2',
            name: 'พัฒนา Frontend และ Dashboard',
            weight: 45,
            progress: 50,
            owner: 'นายกิตติ คงเจริญ',
            hasBOQ: true,
            boq: [
              { description: 'ค่าพัฒนา Frontend Module', quantity: 1, unit: 'งาน', unitPrice: 620000 },
              { description: 'ค่าทดสอบ UX และแก้ไขตามผลทดสอบ', quantity: 1, unit: 'งาน', unitPrice: 160000 },
            ],
          },
        ],
      },
      {
        code: '3.0',
        name: 'เชื่อมต่อระบบภายนอก',
        weight: 25,
        progress: 20,
        durationDays: 45,
        children: [
          {
            code: '3.1',
            name: 'เชื่อมต่อ Single Sign-On',
            weight: 60,
            progress: 25,
            owner: 'นายกิตติ คงเจริญ',
            hasBOQ: true,
            boq: [
              { description: 'ค่าพัฒนา SSO Connector และ Mapping สิทธิ์', quantity: 1, unit: 'งาน', unitPrice: 240000 },
              { description: 'ค่าทดสอบ Security/UAT กับ IdP กลาง', quantity: 1, unit: 'งาน', unitPrice: 95000 },
            ],
          },
          {
            code: '3.2',
            name: 'เชื่อมต่อการชำระเงินออนไลน์',
            weight: 40,
            progress: 10,
            owner: 'นายกิตติ คงเจริญ',
            hasBOQ: true,
            boq: [
              { description: 'ค่า onboarding payment gateway และ webhook', quantity: 1, unit: 'งาน', unitPrice: 180000 },
            ],
          },
        ],
      },
      {
        code: '4.0',
        name: 'ทดสอบและเตรียมใช้งาน',
        weight: 15,
        progress: 0,
        durationDays: 34,
        children: [
          { code: '4.1', name: 'UAT กับเจ้าหน้าที่กิจกรรม', weight: 60, progress: 0, owner: 'น.ส.สมศรี วรรณดี' },
          { code: '4.2', name: 'อบรมและเตรียม Go-live', weight: 40, progress: 0, owner: 'น.ส.สมศรี วรรณดี' },
        ],
      },
    ],
    milestones: [
      { number: 1, name: 'Sign-off Requirements', dueDate: '2026-02-05', percentage: 20, deliverables: 'Requirement baseline', status: 'in_progress' },
      { number: 2, name: 'Core Modules Ready', dueDate: '2026-04-17', percentage: 35, deliverables: 'Booking API + Frontend alpha', status: 'in_progress' },
      { number: 3, name: 'Integration & UAT', dueDate: '2026-06-02', percentage: 25, deliverables: 'SSO/Payment integration', status: 'in_progress' },
      { number: 4, name: 'Go-live', dueDate: '2026-07-07', percentage: 20, deliverables: 'Production launch + handover', status: 'pending' },
    ],
    reports: [
      {
        reportNumber: 21,
        date: '2026-07-08',
        weather: 'ฝนเล็กน้อย (Light Rain)',
        temperature: 30,
        linkedWbsCodes: ['2.1', '2.2'],
        activities: [
          { wbsCode: '2.1', task: 'ทดสอบ API จองกิจกรรมกับฐานข้อมูลจริง', quantity: 8, unit: 'ชั่วโมง', cumulativeProgress: 0.55 },
          { wbsCode: '2.2', task: 'ปรับ UI หน้าสมัครสมาชิก', quantity: 5, unit: 'หน้าจอ', cumulativeProgress: 0.48 },
        ],
        issues: 'พบ response time สูงกว่าที่กำหนดในชั่วโมงเร่งด่วน',
        status: 'submitted',
      },
      {
        reportNumber: 22,
        date: '2026-07-14',
        weather: 'แดดจัด (Sunny)',
        temperature: 31,
        linkedWbsCodes: ['3.1'],
        activities: [
          { wbsCode: '3.1', task: 'ทดสอบการเชื่อมต่อ SSO รอบที่ 2', quantity: 6, unit: 'กรณีทดสอบ', cumulativeProgress: 0.25 },
        ],
        issues: 'Token refresh จากระบบ SSO หมดอายุเร็วเกินกำหนด',
        status: 'draft',
      },
    ],
    issues: [
      {
        title: 'เวลาโหลดหน้าเลือกกิจกรรมเกิน 3 วินาที',
        severity: 'high',
        status: 'in_progress',
        linkedWbs: 'WBS 2.2',
        slaHours: 24,
        createdAt: '2026-07-08',
        progress: 60,
      },
      {
        title: 'การยืนยันตัวตน SSO คืนค่า role ไม่ครบ',
        severity: 'medium',
        status: 'open',
        linkedWbs: 'WBS 3.1',
        slaHours: 48,
        createdAt: '2026-07-14',
      },
      {
        title: 'อีเมลแจ้งเตือนสมัครกิจกรรมส่งซ้ำ',
        severity: 'low',
        status: 'review',
        linkedWbs: 'WBS 2.1',
        slaHours: 72,
        createdAt: '2026-07-05',
        resolution: 'ปรับ queue worker แล้ว รอทดสอบซ้ำ',
      },
    ],
    risks: [
      {
        title: 'ผู้ให้บริการ SSO เปลี่ยน endpoint ช่วงใกล้ go-live',
        description: 'หาก endpoint เปลี่ยนจะกระทบการเชื่อมต่อระบบสมาชิก',
        likelihood: 3,
        impact: 4,
        status: 'mitigating',
        dateIdentified: '2026-06-20',
        mitigation: 'ล็อก API contract และเตรียม fallback login',
      },
      {
        title: 'การทดสอบ UAT ล่าช้าเพราะผู้ใช้ไม่พร้อม',
        description: 'เจ้าหน้าที่กิจกรรมมีภารกิจจัดงานช่วงปลายเดือน',
        likelihood: 4,
        impact: 3,
        status: 'open',
        dateIdentified: '2026-07-01',
        mitigation: 'จอง slot UAT ล่วงหน้าและจัดรอบทดสอบย่อย',
      },
      {
        title: 'ข้อมูลกิจกรรมเดิมไม่สมบูรณ์สำหรับ migration',
        description: 'บางกิจกรรมไม่มีรหัสหน่วยงานและจำนวนรับที่นั่ง',
        likelihood: 2,
        impact: 3,
        status: 'accepted',
        dateIdentified: '2026-05-25',
        mitigation: 'ยอมรับความเสี่ยงและให้แก้ข้อมูลบางส่วนด้วยมือ',
      },
    ],
    gates: [
      { number: 0, name: 'Discovery', nameEn: 'Discovery', status: 'passed', date: '2026-03-10' },
      { number: 1, name: 'Design Review', nameEn: 'Design Review', status: 'passed', date: '2026-04-12' },
      { number: 2, name: 'Security Review', nameEn: 'Security Review', status: 'conditional', date: '2026-07-01', checklist: [{ item: 'ทำ Threat Model', status: 'passed' }, { item: 'ปิดช่องโหว่ session fixation', status: 'warning' }] },
      { number: 3, name: 'Go-live Readiness', nameEn: 'Go-live Readiness', status: 'pending', date: null },
    ],
    itpItems: [
      { sequence: 1, item: 'Code Review Backend', standard: 'NSM Secure Coding', inspectionType: 'RS', inspector: 'Tech Lead', status: 'passed' },
      { sequence: 2, item: 'API Load Test', standard: 'P95 < 3s', inspectionType: 'W', inspector: 'QA Engineer', status: 'pending' },
      { sequence: 3, item: 'UAT Scenario Sign-off', standard: 'UAT Checklist v2', inspectionType: 'H', inspector: 'Product Owner', status: 'pending' },
    ],
    inspections: [
      {
        title: 'Security Review รอบกลางโครงการ',
        itpSequence: 2,
        date: '2026-07-01',
        time: '14:00',
        wbsCode: 'WBS 3.1 เชื่อมต่อ Single Sign-On',
        standards: ['OWASP ASVS', 'NSM Secure Coding'],
        overallResult: 'conditional',
        failReason: 'ต้องแก้การจัดการ session timeout ก่อน go-live',
        checklist: [
          { id: 'cl-2001', item: 'ตรวจ session timeout', criteria: 'หมดอายุเกิน 30 นาทีไม่ได้', result: 'fail', note: 'ยัง timeout 45 นาที' },
          { id: 'cl-2002', item: 'ตรวจ audit log', criteria: 'ต้องมี log สำคัญครบ', result: 'pass', note: 'ผ่าน' },
        ],
      },
    ],
    documents: {
      folders: ['Requirements', 'Design', 'Sprint Demos', 'UAT'],
      files: [
        { folder: 'Requirements', name: 'Requirement_Baseline_v2.docx', type: 'Requirements', version: 2, size: '1.2 MB', uploadedAt: '2026-04-15', status: 'approved', workflow: ['submitted', 'reviewed', 'approved'] },
        { folder: 'Design', name: 'Booking_System_Architecture.pdf', type: 'Architecture', version: 1, size: '3.4 MB', uploadedAt: '2026-05-02', status: 'approved', workflow: ['submitted', 'reviewed', 'approved'] },
        { folder: 'Sprint Demos', name: 'Sprint5_Demo_Notes.pdf', type: 'Meeting Note', version: 1, size: '0.9 MB', uploadedAt: '2026-07-09', status: 'under_review', workflow: ['submitted', 'under_review', 'pending'] },
        { folder: 'UAT', name: 'UAT_Scenario_Checklist.xlsx', type: 'Checklist', version: 1, size: '0.6 MB', uploadedAt: '2026-07-12', status: 'draft', workflow: ['submitted', 'pending', 'pending'] },
      ],
    },
    changeRequests: [
      {
        id: 'CR-201',
        title: 'เพิ่มขั้นตอน OTP ก่อนยืนยันการจอง',
        reason: 'ลดการจองซ้ำและยืนยันตัวตนผู้ใช้งาน',
        budgetImpact: 120000,
        scheduleImpact: 7,
        linkedWbs: 'WBS 3.1 เชื่อมต่อ Single Sign-On',
        priority: 'medium',
        status: 'pending',
        requestedAt: '2026-07-10',
        attachments: ['CR-201_OTP_Request.pdf', 'Impact_Assessment_CR201.xlsx'],
        workflow: [
          { step: 'ส่งคำขอ', user: 'น.ส.สมศรี วรรณดี', date: '2026-07-10', status: 'done' },
          { step: 'หัวหน้ากองพิจารณา', user: 'นายสมชาย กิตติพงษ์', date: null, status: 'current' },
          { step: 'รอง ผอ. อนุมัติ', user: 'นายธนา กมลรัตน์', date: null, status: 'pending' },
        ],
      },
    ],
    evm: [
      { month: '2026-03', pv: 450000, ev: 420000, ac: 430000 },
      { month: '2026-04', pv: 1100000, ev: 1020000, ac: 1040000 },
      { month: '2026-05', pv: 1800000, ev: 1620000, ac: 1655000 },
      { month: '2026-06', pv: 2400000, ev: 2280000, ac: 2325000 },
    ],
  },
  'proj-003': {
    phases: [
      {
        code: '1.0',
        name: 'กำหนดสเปคและ TOR',
        weight: 20,
        progress: 100,
        durationDays: 18,
        children: [
          { code: '1.1', name: 'จัดทำ TOR ระบบ AV', weight: 60, progress: 100, owner: 'นายสมชาย กิตติพงษ์' },
          { code: '1.2', name: 'ตรวจสอบตลาดและราคาอ้างอิง', weight: 40, progress: 100, owner: 'น.ส.พิมพ์ลดา งามวงศ์' },
        ],
      },
      {
        code: '2.0',
        name: 'จัดซื้อและคัดเลือกผู้ขาย',
        weight: 35,
        progress: 100,
        durationDays: 20,
        children: [
          {
            code: '2.1',
            name: 'ประกวดราคาและประเมินข้อเสนอ',
            weight: 55,
            progress: 100,
            owner: 'น.ส.พิมพ์ลดา งามวงศ์',
            hasBOQ: true,
            boq: [
              { description: 'ระบบประชุมภาพและเสียง', quantity: 1, unit: 'ชุด', unitPrice: 1650000 },
              { description: 'จอ LED ห้องประชุม', quantity: 2, unit: 'จอ', unitPrice: 320000 },
            ],
          },
          {
            code: '2.2',
            name: 'ออกใบสั่งซื้อและแผนส่งมอบ',
            weight: 45,
            progress: 100,
            owner: 'นายสมชาย กิตติพงษ์',
            hasBOQ: true,
            boq: [
              { description: 'ค่าระบบบริหารจัดการสัญญาและประกันผลงาน', quantity: 1, unit: 'งาน', unitPrice: 125000 },
            ],
          },
        ],
      },
      {
        code: '3.0',
        name: 'ติดตั้งและทดสอบระบบ',
        weight: 30,
        progress: 80,
        durationDays: 30,
        children: [
          {
            code: '3.1',
            name: 'ติดตั้งอุปกรณ์ AV และเดินสาย',
            weight: 65,
            progress: 100,
            owner: 'น.ส.พิมพ์ลดา งามวงศ์',
            hasBOQ: true,
            boq: [
              { description: 'สายสัญญาณ HDMI/Network และอุปกรณ์ติดตั้ง', quantity: 1, unit: 'lot', unitPrice: 185000 },
              { description: 'ตู้ Rack และระบบจ่ายไฟอุปกรณ์ AV', quantity: 2, unit: 'ตู้', unitPrice: 78000 },
            ],
          },
          { code: '3.2', name: 'ทดสอบเสียง ภาพ และระบบควบคุม', weight: 35, progress: 80, owner: 'นายสมชาย กิตติพงษ์' },
        ],
      },
      {
        code: '4.0',
        name: 'ตรวจรับและส่งมอบ',
        weight: 15,
        progress: 0,
        durationDays: 20,
        children: [
          { code: '4.1', name: 'อบรมผู้ใช้งานห้องประชุม', weight: 50, progress: 0, owner: 'น.ส.พิมพ์ลดา งามวงศ์' },
          { code: '4.2', name: 'ตรวจรับ Final Acceptance Test', weight: 50, progress: 0, owner: 'นายสมชาย กิตติพงษ์' },
        ],
      },
    ],
    milestones: [
      { number: 1, name: 'TOR Approved', dueDate: '2026-01-28', percentage: 20, deliverables: 'TOR และราคากลาง', status: 'completed' },
      { number: 2, name: 'PO Issued', dueDate: '2026-02-18', percentage: 30, deliverables: 'ผู้ขายได้รับ PO', status: 'completed' },
      { number: 3, name: 'Installation Complete', dueDate: '2026-03-21', percentage: 30, deliverables: 'ติดตั้งและ SAT', status: 'in_progress' },
      { number: 4, name: 'Final Handover', dueDate: '2026-04-11', percentage: 20, deliverables: 'FAT + training', status: 'pending' },
    ],
    reports: [
      {
        reportNumber: 12,
        date: '2026-07-10',
        weather: 'แดดจัด (Sunny)',
        temperature: 31,
        linkedWbsCodes: ['3.1', '3.2'],
        activities: [
          { wbsCode: '3.1', task: 'ติดตั้งจอ LED และระบบควบคุมกลาง', quantity: 2, unit: 'ชุด', cumulativeProgress: 0.78 },
          { wbsCode: '3.2', task: 'ทดสอบเสียงไมโครโฟนไร้สาย', quantity: 6, unit: 'ชุด', cumulativeProgress: 0.62 },
        ],
        issues: 'พบสัญญาณรบกวนจากสายสัญญาณ HDMI บางจุด',
        status: 'submitted',
      },
      {
        reportNumber: 13,
        date: '2026-07-15',
        weather: 'มีเมฆบางส่วน (Partly Cloudy)',
        temperature: 30,
        linkedWbsCodes: ['4.1'],
        activities: [
          { wbsCode: '4.1', task: 'อบรมเจ้าหน้าที่ใช้งานระบบประชุม', quantity: 18, unit: 'คน', cumulativeProgress: 0.5 },
        ],
        issues: 'ผู้ใช้งานขอคู่มือฉบับภาษาไทยเพิ่มเติม',
        status: 'draft',
      },
    ],
    issues: [
      {
        title: 'สาย HDMI บางจุดเกิดสัญญาณรบกวน',
        severity: 'medium',
        status: 'in_progress',
        linkedWbs: 'WBS 3.1',
        slaHours: 48,
        createdAt: '2026-07-10',
        progress: 70,
      },
      {
        title: 'Firmware จอหลักยังไม่เป็นเวอร์ชันล่าสุด',
        severity: 'low',
        status: 'review',
        linkedWbs: 'WBS 3.2',
        slaHours: 72,
        createdAt: '2026-07-07',
        resolution: 'อัปเดตแล้ว รอ FAT',
      },
      {
        title: 'คู่มือใช้งานภาษาไทยยังไม่ครบชุด',
        severity: 'low',
        status: 'open',
        linkedWbs: 'WBS 4.1',
        slaHours: 96,
        createdAt: '2026-07-15',
      },
    ],
    risks: [
      {
        title: 'อุปกรณ์สำรองบางรายการยังไม่เข้าคลัง',
        description: 'หากอุปกรณ์หลักมีปัญหาจะไม่มีอะไหล่สำรองทันที',
        likelihood: 2,
        impact: 4,
        status: 'open',
        dateIdentified: '2026-06-25',
        mitigation: 'เร่งผู้ขายส่ง spare parts ก่อน FAT',
      },
      {
        title: 'ระบบควบคุมกลางอาจไม่รองรับโปรเจกเตอร์รุ่นเดิม',
        description: 'ต้องทดสอบ compatibility ก่อนส่งมอบ',
        likelihood: 3,
        impact: 3,
        status: 'mitigating',
        dateIdentified: '2026-06-10',
        mitigation: 'จัดรอบ compatibility test เพิ่ม',
      },
      {
        title: 'ผู้ใช้งานจริงไม่พร้อมในวันอบรม',
        description: 'อาจต้องเลื่อนการอบรมและส่งผลต่อ handover',
        likelihood: 2,
        impact: 2,
        status: 'accepted',
        dateIdentified: '2026-07-05',
        mitigation: 'ยอมรับความเสี่ยงและเตรียมวิดีโออบรมสำรอง',
      },
    ],
    gates: [
      { number: 0, name: 'TOR Review', nameEn: 'TOR Review', status: 'passed', date: '2026-01-20' },
      { number: 1, name: 'Factory Acceptance', nameEn: 'Factory Acceptance', status: 'passed', date: '2026-05-15' },
      { number: 2, name: 'Site Acceptance', nameEn: 'Site Acceptance', status: 'conditional', date: '2026-07-12', checklist: [{ item: 'เสียงไมโครโฟน', status: 'warning' }, { item: 'ภาพจอหลัก', status: 'passed' }] },
      { number: 3, name: 'Final Handover', nameEn: 'Final Handover', status: 'pending', date: null },
    ],
    itpItems: [
      { sequence: 1, item: 'ตรวจสอบการติดตั้งสายสัญญาณ', standard: 'AV Wiring Spec Rev.2', inspectionType: 'W', inspector: 'Coordinator', status: 'passed' },
      { sequence: 2, item: 'ทดสอบระบบควบคุมกลาง', standard: 'Control System SAT', inspectionType: 'H', inspector: 'PM + Vendor', status: 'pending' },
      { sequence: 3, item: 'Final Acceptance Test', standard: 'FAT/SAT Checklist', inspectionType: 'H', inspector: 'PM + User', status: 'pending' },
    ],
    inspections: [
      {
        title: 'Site Acceptance Test ห้องประชุม',
        itpSequence: 2,
        date: '2026-07-12',
        time: '13:30',
        wbsCode: 'WBS 3.2 ทดสอบเสียง ภาพ และระบบควบคุม',
        standards: ['SAT Checklist Rev.1'],
        overallResult: 'conditional',
        failReason: 'ไมโครโฟนไร้สาย 2 ตัวมี noise level สูง',
        checklist: [
          { id: 'cl-3001', item: 'ทดสอบภาพจอหลัก', criteria: 'ภาพชัดครบ 4K', result: 'pass', note: 'ผ่าน' },
          { id: 'cl-3002', item: 'ทดสอบเสียงไมโครโฟน', criteria: 'ไม่มี noise ชัดเจน', result: 'fail', note: 'พบ noise 2 ช่องสัญญาณ' },
        ],
      },
    ],
    documents: {
      folders: ['TOR', 'Procurement', 'Installation', 'Acceptance'],
      files: [
        { folder: 'TOR', name: 'TOR_AV_System_Final.pdf', type: 'TOR', version: 1, size: '2.1 MB', uploadedAt: '2026-01-18', status: 'approved', workflow: ['submitted', 'reviewed', 'approved'] },
        { folder: 'Procurement', name: 'PO_AV_Supplier.pdf', type: 'Purchase Order', version: 1, size: '1.4 MB', uploadedAt: '2026-04-01', status: 'approved', workflow: ['submitted', 'reviewed', 'approved'] },
        { folder: 'Installation', name: 'Cable_AsBuilt_Rev1.pdf', type: 'As-Built', version: 1, size: '4.2 MB', uploadedAt: '2026-07-09', status: 'under_review', workflow: ['submitted', 'under_review', 'pending'] },
        { folder: 'Acceptance', name: 'FAT_SAT_Checklist.xlsx', type: 'Checklist', version: 2, size: '0.7 MB', uploadedAt: '2026-07-12', status: 'draft', workflow: ['submitted', 'pending', 'pending'] },
      ],
    },
    changeRequests: [
      {
        id: 'CR-301',
        title: 'เพิ่มไมโครโฟนไร้สายสำรอง 2 ชุด',
        reason: 'รองรับกิจกรรมที่มีวิทยากรหลายท่าน',
        budgetImpact: 95000,
        scheduleImpact: 3,
        linkedWbs: 'WBS 2.1 ประกวดราคาและประเมินข้อเสนอ',
        priority: 'low',
        status: 'approved',
        requestedAt: '2026-05-25',
        attachments: ['CR-301_Microphone.pdf'],
        workflow: [
          { step: 'ส่งคำขอ', user: 'นายสมชาย กิตติพงษ์', date: '2026-05-25', status: 'done' },
          { step: 'หัวหน้ากองพิจารณา', user: 'นายสมชาย กิตติพงษ์', date: '2026-05-27', status: 'done' },
        ],
      },
    ],
    evm: [
      { month: '2026-03', pv: 560000, ev: 560000, ac: 560000, paidToDate: 560000 },
      { month: '2026-04', pv: 1350000, ev: 1365000, ac: 1400000, paidToDate: 1400000 },
      { month: '2026-05', pv: 2100000, ev: 2140000, ac: 1400000, paidToDate: 1400000 },
      { month: '2026-06', pv: 2520000, ev: 2580000, ac: 1400000, paidToDate: 1400000 },
    ],
  },
  'proj-004': {
    phases: [
      {
        code: '1.0',
        name: 'สำรวจและจัดทำแนวคิด',
        weight: 25,
        progress: 10,
        durationDays: 45,
        children: [
          { code: '1.1', name: 'สำรวจสภาพอาคารและระบบเดิม', weight: 55, progress: 20, owner: 'น.ส.วิภา ขจรศักดิ์' },
          { code: '1.2', name: 'จัดทำแนวคิดการปรับปรุงพื้นที่', weight: 45, progress: 5, owner: 'น.ส.สุดา ฉัตรศรี' },
        ],
      },
      {
        code: '2.0',
        name: 'ออกแบบรายละเอียด',
        weight: 30,
        progress: 0,
        durationDays: 60,
        children: [
          { code: '2.1', name: 'จัดทำแบบสถาปัตย์/วิศวกรรม', weight: 60, progress: 0, owner: 'น.ส.วิภา ขจรศักดิ์' },
          {
            code: '2.2',
            name: 'จัดทำราคากลางและ BOQ',
            weight: 40,
            progress: 0,
            owner: 'น.ส.สุดา ฉัตรศรี',
            hasBOQ: true,
            boq: [
              { description: 'ค่าจ้างออกแบบและจัดทำ BOQ', quantity: 1, unit: 'งาน', unitPrice: 480000 },
              { description: 'ค่า BIM และประมาณราคาเบื้องต้น', quantity: 1, unit: 'งาน', unitPrice: 220000 },
            ],
          },
        ],
      },
      {
        code: '3.0',
        name: 'จัดเตรียมการจัดซื้อจัดจ้าง',
        weight: 25,
        progress: 0,
        durationDays: 55,
        children: [
          { code: '3.1', name: 'ทบทวน TOR และเงื่อนไขประกวดราคา', weight: 55, progress: 0, owner: 'น.ส.สุดา ฉัตรศรี' },
          { code: '3.2', name: 'ขออนุมัติงบประมาณและแผนจัดซื้อ', weight: 45, progress: 0, owner: 'น.ส.วิภา ขจรศักดิ์' },
        ],
      },
      {
        code: '4.0',
        name: 'เตรียมพื้นที่ก่อนเริ่มงาน',
        weight: 20,
        progress: 0,
        durationDays: 30,
        children: [
          { code: '4.1', name: 'สำรวจวัสดุอันตรายและโครงสร้างเดิม', weight: 50, progress: 0, owner: 'น.ส.สุดา ฉัตรศรี' },
          {
            code: '4.2',
            name: 'จัดแผนย้ายพื้นที่จัดแสดงชั่วคราว',
            weight: 50,
            progress: 0,
            owner: 'น.ส.วิภา ขจรศักดิ์',
            hasBOQ: true,
            boq: [
              { description: 'ค่าวัสดุป้องกันและแพ็คชิ้นจัดแสดง', quantity: 1, unit: 'lot', unitPrice: 145000 },
              { description: 'ค่าขนย้ายชิ้นจัดแสดงไปพื้นที่ชั่วคราว', quantity: 6, unit: 'เที่ยว', unitPrice: 12500 },
            ],
          },
        ],
      },
    ],
    milestones: [
      { number: 1, name: 'Kickoff & Survey', dueDate: '2026-11-15', percentage: 15, deliverables: 'รายงานสำรวจและแนวคิด', status: 'in_progress' },
      { number: 2, name: 'Detailed Design', dueDate: '2027-01-15', percentage: 30, deliverables: 'แบบรายละเอียด + BOQ', status: 'pending' },
      { number: 3, name: 'Procurement Ready', dueDate: '2027-03-12', percentage: 25, deliverables: 'TOR และเอกสารจัดซื้อ', status: 'pending' },
      { number: 4, name: 'Site Ready', dueDate: '2027-04-12', percentage: 30, deliverables: 'พื้นที่พร้อมเริ่มงาน', status: 'pending' },
    ],
    reports: [
      {
        reportNumber: 1,
        date: '2026-10-03',
        weather: 'แดดจัด (Sunny)',
        temperature: 33,
        linkedWbsCodes: ['1.1'],
        activities: [
          { wbsCode: '1.1', task: 'สำรวจอาคารและเก็บข้อมูลระบบเดิม', quantity: 1, unit: 'รอบสำรวจ', cumulativeProgress: 0.1 },
        ],
        issues: 'ยังไม่พบปัญหาหน้างาน แต่รอแบบเดิมจากอาคารสถานที่',
        status: 'submitted',
      },
      {
        reportNumber: 2,
        date: '2026-10-10',
        weather: 'ฝนตก (Rainy)',
        temperature: 29,
        linkedWbsCodes: ['1.2'],
        activities: [
          { wbsCode: '1.2', task: 'ประชุมแนวคิดการใช้งานพื้นที่กับ curator', quantity: 1, unit: 'ครั้ง', cumulativeProgress: 0.05 },
        ],
        issues: 'ต้องรอผลสำรวจวัสดุอันตรายก่อนสรุปแนวคิด',
        status: 'draft',
      },
    ],
    issues: [
      {
        title: 'แบบอาคารเดิมบางส่วนยังหาไม่พบ',
        severity: 'medium',
        status: 'open',
        linkedWbs: 'WBS 1.1',
        slaHours: 120,
        createdAt: '2026-10-03',
      },
      {
        title: 'ต้องสำรวจ asbestos ก่อนออกแบบรายละเอียด',
        severity: 'high',
        status: 'in_progress',
        linkedWbs: 'WBS 4.1',
        slaHours: 240,
        createdAt: '2026-10-08',
        progress: 35,
      },
    ],
    risks: [
      {
        title: 'ผลสำรวจวัสดุอันตรายอาจทำให้ขอบเขตงานเพิ่ม',
        description: 'หากพบ asbestos ต้องเพิ่มงบกำจัดวัสดุอันตราย',
        likelihood: 4,
        impact: 4,
        status: 'open',
        dateIdentified: '2026-10-05',
        mitigation: 'กัน contingency และเร่งผลสำรวจในช่วงต้น',
      },
      {
        title: 'ขออนุมัติงบประมาณอาจใช้เวลานานกว่ากำหนด',
        description: 'งบโครงการมีวงเงินสูงและต้องผ่านหลายระดับ',
        likelihood: 3,
        impact: 4,
        status: 'mitigating',
        dateIdentified: '2026-10-01',
        mitigation: 'เตรียมเอกสารเสนอขออนุมัติล่วงหน้าเป็นเฟส',
      },
      {
        title: 'การย้ายพื้นที่จัดแสดงชั่วคราวอาจกระทบผู้เข้าชม',
        description: 'ต้องวางแผน communication และพื้นที่สำรอง',
        likelihood: 2,
        impact: 3,
        status: 'open',
        dateIdentified: '2026-10-10',
        mitigation: 'กำหนดแผนย้ายพื้นที่และป้ายสื่อสารผู้เข้าชม',
      },
    ],
    gates: [
      { number: 0, name: 'Project Kickoff', nameEn: 'Project Kickoff', status: 'passed', date: '2026-10-01' },
      { number: 1, name: 'Survey Review', nameEn: 'Survey Review', status: 'conditional', date: '2026-10-10', checklist: [{ item: 'มีแบบอาคารเดิมครบ', status: 'warning' }, { item: 'มีแผนสำรวจวัสดุอันตราย', status: 'passed' }] },
      { number: 2, name: 'Design Freeze', nameEn: 'Design Freeze', status: 'pending', date: null },
      { number: 3, name: 'Tender Readiness', nameEn: 'Tender Readiness', status: 'pending', date: null },
    ],
    itpItems: [
      { sequence: 1, item: 'ตรวจสอบข้อมูลอาคารเดิม', standard: 'As-built verification checklist', inspectionType: 'RS', inspector: 'PM', status: 'pending' },
      { sequence: 2, item: 'ทบทวน concept design กับ curator', standard: 'Concept review minutes', inspectionType: 'W', inspector: 'Curator', status: 'pending' },
      { sequence: 3, item: 'ตรวจผลสำรวจวัสดุอันตราย', standard: 'Hazmat survey report', inspectionType: 'H', inspector: 'Consultant', status: 'awaiting' },
    ],
    inspections: [
      {
        title: 'Kickoff Survey Review',
        itpSequence: 1,
        date: '2026-10-10',
        time: '10:00',
        wbsCode: 'WBS 1.1 สำรวจสภาพอาคารและระบบเดิม',
        standards: ['Survey checklist v1'],
        overallResult: 'conditional',
        failReason: 'ยังขาดแบบอาคารเดิมบางส่วนจากฝ่ายอาคารสถานที่',
        checklist: [
          { id: 'cl-4001', item: 'มีแปลนอาคารเดิม', criteria: 'ครบทุกชั้น', result: 'fail', note: 'ยังขาดชั้นใต้ดิน' },
          { id: 'cl-4002', item: 'มีผลสำรวจระบบไฟฟ้า/ปรับอากาศ', criteria: 'ครบทุกระบบหลัก', result: 'pass', note: 'ผ่าน' },
        ],
      },
    ],
    documents: {
      folders: ['Survey', 'Concept Design', 'Budget Request', 'Procurement Prep'],
      files: [
        { folder: 'Survey', name: 'Survey_Report_BuildingB.pdf', type: 'Survey Report', version: 1, size: '2.8 MB', uploadedAt: '2026-10-03', status: 'under_review', workflow: ['submitted', 'under_review', 'pending'] },
        { folder: 'Concept Design', name: 'Concept_Board_MuseumB.pdf', type: 'Concept Design', version: 1, size: '6.4 MB', uploadedAt: '2026-10-10', status: 'draft', workflow: ['submitted', 'pending', 'pending'] },
        { folder: 'Budget Request', name: 'Budget_Request_Package.xlsx', type: 'Budget Package', version: 1, size: '0.8 MB', uploadedAt: '2026-10-11', status: 'draft', workflow: ['submitted', 'pending', 'pending'] },
        { folder: 'Procurement Prep', name: 'Tender_Preparation_Checklist.docx', type: 'Checklist', version: 1, size: '0.4 MB', uploadedAt: '2026-10-12', status: 'approved', workflow: ['submitted', 'reviewed', 'approved'] },
      ],
    },
    changeRequests: [
      {
        id: 'CR-401',
        title: 'ขยายขอบเขตงานสำรวจวัสดุอันตราย',
        reason: 'พบพื้นที่เพิ่มเติมที่ต้องตรวจสอบก่อนออกแบบ',
        budgetImpact: 185000,
        scheduleImpact: 10,
        linkedWbs: 'WBS 4.1 สำรวจวัสดุอันตรายและโครงสร้างเดิม',
        priority: 'high',
        status: 'pending',
        requestedAt: '2026-10-12',
        attachments: ['CR-401_Hazmat_Scope.pdf'],
        workflow: [
          { step: 'ส่งคำขอ', user: 'น.ส.วิภา ขจรศักดิ์', date: '2026-10-12', status: 'done' },
          { step: 'หัวหน้ากองพิจารณา', user: 'นายสมชาย กิตติพงษ์', date: null, status: 'current' },
        ],
      },
    ],
    evm: [],
  },
  'proj-005': {
    phases: [
      {
        code: '1.0',
        name: 'ออกแบบการวิจัย',
        weight: 20,
        progress: 100,
        durationDays: 30,
        children: [
          { code: '1.1', name: 'จัดทำแบบสอบถามและแผนสุ่มตัวอย่าง', weight: 60, progress: 100, owner: 'นายสมชาย กิตติพงษ์' },
          { code: '1.2', name: 'ทบทวนโดยผู้เชี่ยวชาญ', weight: 40, progress: 100, owner: 'น.ส.นภา ศรีสุข' },
        ],
      },
      {
        code: '2.0',
        name: 'เก็บข้อมูลภาคสนาม',
        weight: 35,
        progress: 100,
        durationDays: 60,
        children: [
          { code: '2.1', name: 'สำรวจผู้เข้าชมในพิพิธภัณฑ์หลัก', weight: 55, progress: 100, owner: 'น.ส.นภา ศรีสุข', hasBOQ: true, boq: [{ description: 'ค่าจ้างผู้ช่วยเก็บข้อมูล', quantity: 45, unit: 'วันคน', unitPrice: 1200 }, { description: 'ค่าอุปกรณ์ Tablet Survey', quantity: 4, unit: 'เครื่อง', unitPrice: 18000 }] },
          {
            code: '2.2',
            name: 'เก็บข้อมูลออนไลน์และโทรศัพท์',
            weight: 45,
            progress: 100,
            owner: 'น.ส.นภา ศรีสุข',
            hasBOQ: true,
            boq: [
              { description: 'ค่าบริการโทรสัมภาษณ์และบันทึกข้อมูล', quantity: 30, unit: 'วันคน', unitPrice: 1450 },
              { description: 'ค่าระบบส่งแบบสอบถามออนไลน์และ SMS', quantity: 1, unit: 'โครงการ', unitPrice: 38000 },
            ],
          },
        ],
      },
      {
        code: '3.0',
        name: 'วิเคราะห์ข้อมูล',
        weight: 25,
        progress: 100,
        durationDays: 45,
        children: [
          { code: '3.1', name: 'ทำความสะอาดข้อมูลและถ่วงน้ำหนัก', weight: 50, progress: 100, owner: 'นายสมชาย กิตติพงษ์' },
          { code: '3.2', name: 'วิเคราะห์ผลและสรุปข้อค้นพบ', weight: 50, progress: 100, owner: 'น.ส.นภา ศรีสุข' },
        ],
      },
      {
        code: '4.0',
        name: 'จัดทำรายงานและเผยแพร่',
        weight: 20,
        progress: 100,
        durationDays: 47,
        children: [
          { code: '4.1', name: 'จัดทำรายงานฉบับสมบูรณ์', weight: 60, progress: 100, owner: 'นายสมชาย กิตติพงษ์' },
          { code: '4.2', name: 'นำเสนอผลต่อผู้บริหาร', weight: 40, progress: 100, owner: 'น.ส.นภา ศรีสุข' },
        ],
      },
    ],
    milestones: [
      { number: 1, name: 'Research Design Approved', dueDate: '2025-10-31', percentage: 20, deliverables: 'แบบสอบถามและ sampling plan', status: 'completed' },
      { number: 2, name: 'Fieldwork Complete', dueDate: '2025-12-31', percentage: 30, deliverables: 'ข้อมูลดิบครบตามเป้า', status: 'completed' },
      { number: 3, name: 'Analysis Complete', dueDate: '2026-02-15', percentage: 25, deliverables: 'dataset clean + findings', status: 'completed' },
      { number: 4, name: 'Final Report Delivered', dueDate: '2026-04-04', percentage: 25, deliverables: 'รายงานฉบับสมบูรณ์และ presentation', status: 'completed' },
    ],
    reports: [
      {
        reportNumber: 8,
        date: '2026-01-12',
        weather: 'แดดจัด (Sunny)',
        temperature: 32,
        linkedWbsCodes: ['2.1'],
        activities: [
          { wbsCode: '2.1', task: 'เก็บข้อมูลผู้เข้าชมรอบเช้าและบ่าย', quantity: 126, unit: 'ชุดแบบสอบถาม', cumulativeProgress: 0.92 },
        ],
        issues: 'ผู้ตอบบางส่วนขอแบบสอบถามเวอร์ชันภาษาอังกฤษ',
        status: 'approved',
      },
      {
        reportNumber: 9,
        date: '2026-03-25',
        weather: 'มีเมฆบางส่วน (Partly Cloudy)',
        temperature: 31,
        linkedWbsCodes: ['4.1'],
        activities: [
          { wbsCode: '4.1', task: 'สรุปผลและจัดรูปเล่มรายงาน', quantity: 1, unit: 'ฉบับ', cumulativeProgress: 1 },
        ],
        issues: 'ไม่มีประเด็นคงค้าง',
        status: 'approved',
      },
    ],
    issues: [
      {
        title: 'ข้อมูลแบบสอบถามบางส่วนซ้ำซ้อน',
        severity: 'low',
        status: 'closed',
        linkedWbs: 'WBS 3.1',
        slaHours: 96,
        createdAt: '2026-01-20',
        resolution: 'ลบข้อมูลซ้ำและ re-weight sample แล้ว',
        closedAt: '2026-01-24',
      },
      {
        title: 'ต้องปรับ wording รายงานสรุปสำหรับผู้บริหาร',
        severity: 'low',
        status: 'closed',
        linkedWbs: 'WBS 4.1',
        slaHours: 72,
        createdAt: '2026-03-20',
        resolution: 'แก้ไขถ้อยคำและเพิ่ม executive summary แล้ว',
        closedAt: '2026-03-23',
      },
    ],
    risks: [
      {
        title: 'อัตราการตอบแบบสอบถามต่ำกว่ากลุ่มเป้าหมาย',
        description: 'ช่วงต้นโครงการกลุ่มวันธรรมดามีผู้ตอบต่ำกว่าคาด',
        likelihood: 3,
        impact: 3,
        status: 'closed',
        dateIdentified: '2025-12-10',
        mitigation: 'เพิ่มจุดเก็บข้อมูลออนไลน์และขยายเวลาเก็บข้อมูล',
      },
      {
        title: 'ข้อมูลเปิดเผยตัวตนผู้ตอบแบบสอบถาม',
        description: 'ต้องระวังการเก็บข้อมูลส่วนบุคคลเกินความจำเป็น',
        likelihood: 2,
        impact: 4,
        status: 'accepted',
        dateIdentified: '2025-11-05',
        mitigation: 'จำกัดข้อมูลส่วนบุคคลและลบข้อมูลอ่อนไหวหลังสรุปผล',
      },
      {
        title: 'การตีความผลวิจัยคลาดเคลื่อน',
        description: 'ผู้ใช้รายงานอาจสรุปผลเกินกว่าข้อเท็จจริงในตัวอย่าง',
        likelihood: 2,
        impact: 3,
        status: 'closed',
        dateIdentified: '2026-02-10',
        mitigation: 'มี peer review และอธิบายข้อจำกัดการวิจัยในรายงาน',
      },
    ],
    gates: [
      { number: 0, name: 'Methodology Review', nameEn: 'Methodology Review', status: 'passed', date: '2025-11-10' },
      { number: 1, name: 'Fieldwork Readiness', nameEn: 'Fieldwork Readiness', status: 'passed', date: '2025-12-01' },
      { number: 2, name: 'Analysis Review', nameEn: 'Analysis Review', status: 'passed', date: '2026-02-20' },
      { number: 3, name: 'Final Publication', nameEn: 'Final Publication', status: 'passed', date: '2026-03-31' },
    ],
    itpItems: [
      { sequence: 1, item: 'ตรวจสอบแบบสอบถามก่อนใช้จริง', standard: 'Research Instrument Checklist', inspectionType: 'RS', inspector: 'Research Lead', status: 'passed' },
      { sequence: 2, item: 'ทวนสอบคุณภาพข้อมูลภาคสนาม', standard: 'Data Quality Protocol', inspectionType: 'W', inspector: 'PM', status: 'passed' },
      { sequence: 3, item: 'Peer Review รายงานวิจัย', standard: 'Peer Review Checklist', inspectionType: 'H', inspector: 'Academic Committee', status: 'passed' },
    ],
    inspections: [
      {
        title: 'Peer Review รายงานฉบับสมบูรณ์',
        itpSequence: 3,
        date: '2026-03-20',
        time: '09:00',
        wbsCode: 'WBS 4.1 จัดทำรายงานฉบับสมบูรณ์',
        standards: ['Peer Review Checklist'],
        overallResult: 'pass',
        checklist: [
          { id: 'cl-5001', item: 'ผลวิเคราะห์สอดคล้องกับข้อมูล', criteria: 'ต้องมีหลักฐานอ้างอิงครบ', result: 'pass', note: 'ผ่าน' },
          { id: 'cl-5002', item: 'ข้อเสนอแนะปฏิบัติได้จริง', criteria: 'ต้องมี action implication ชัดเจน', result: 'pass', note: 'ผ่าน' },
        ],
      },
    ],
    documents: {
      folders: ['Research Design', 'Field Data', 'Analysis', 'Final Report'],
      files: [
        { folder: 'Research Design', name: 'Questionnaire_vFinal.docx', type: 'Questionnaire', version: 3, size: '0.5 MB', uploadedAt: '2025-11-12', status: 'approved', workflow: ['submitted', 'reviewed', 'approved'] },
        { folder: 'Field Data', name: 'Survey_Dataset_Clean.xlsx', type: 'Dataset', version: 2, size: '1.3 MB', uploadedAt: '2026-02-05', status: 'approved', workflow: ['submitted', 'reviewed', 'approved'] },
        { folder: 'Analysis', name: 'Analysis_Slides_Exec.pdf', type: 'Presentation', version: 1, size: '2.2 MB', uploadedAt: '2026-03-10', status: 'approved', workflow: ['submitted', 'reviewed', 'approved'] },
        { folder: 'Final Report', name: 'Visitor_Satisfaction_Report_2569.pdf', type: 'Final Report', version: 1, size: '4.8 MB', uploadedAt: '2026-03-31', status: 'approved', workflow: ['submitted', 'reviewed', 'approved'] },
      ],
    },
    changeRequests: [
      {
        id: 'CR-501',
        title: 'เพิ่มคำถามเรื่องบริการผู้สูงอายุ',
        reason: 'ผู้บริหารต้องการข้อมูลเชิงลึกเพิ่มเติมสำหรับผู้เข้าชมกลุ่ม senior',
        budgetImpact: 25000,
        scheduleImpact: 0,
        linkedWbs: 'WBS 1.1 จัดทำแบบสอบถามและแผนสุ่มตัวอย่าง',
        priority: 'low',
        status: 'approved',
        requestedAt: '2025-11-08',
        attachments: ['CR-501_SeniorQuestion.pdf'],
        workflow: [
          { step: 'ส่งคำขอ', user: 'นายสมชาย กิตติพงษ์', date: '2025-11-08', status: 'done' },
          { step: 'อนุมัติ', user: 'นายธนา กมลรัตน์', date: '2025-11-09', status: 'done' },
        ],
      },
    ],
    evm: [
      { month: '2025-11', pv: 120000, ev: 118000, ac: 116000 },
      { month: '2025-12', pv: 340000, ev: 336000, ac: 332000 },
      { month: '2026-01', pv: 560000, ev: 558000, ac: 550000 },
      { month: '2026-03', pv: 850000, ev: 850000, ac: 833000 },
    ],
  },
};

const generatedProjects = projects.filter((project) => project.id in generatedProjectScenarios);

export const generatedWbsNodes = generatedProjects.flatMap((project) =>
  buildWbsNodes(project, generatedProjectScenarios[project.id]),
);

export const generatedBoqItems = generatedProjects.flatMap((project) =>
  buildBoqItems(project, generatedProjectScenarios[project.id]),
);

export const generatedDailyReports = generatedProjects.flatMap((project) =>
  buildDailyReports(project, generatedProjectScenarios[project.id]),
);

export const generatedIssues = generatedProjects.flatMap((project) =>
  buildIssues(project, generatedProjectScenarios[project.id]),
);

export const generatedRisks = generatedProjects.flatMap((project) =>
  buildRisks(project, generatedProjectScenarios[project.id]),
);

export const generatedMilestones = generatedProjects.flatMap((project) =>
  buildMilestones(project, generatedProjectScenarios[project.id]),
);

export const generatedQualityGates = generatedProjects.flatMap((project) =>
  buildQualityGates(project, generatedProjectScenarios[project.id]),
);

export const generatedInspectionData = generatedProjects.reduce<InspectionsData>(
  (acc, project) => {
    const data = buildInspectionData(project, generatedProjectScenarios[project.id]);
    acc.itpItems.push(...data.itpItems);
    acc.inspectionRecords.push(...data.inspectionRecords);
    return acc;
  },
  { itpItems: [], inspectionRecords: [] },
);

export const generatedChangeRequests = generatedProjects.flatMap((project) =>
  buildChangeRequests(project, generatedProjectScenarios[project.id]),
);

export const generatedEvmPoints = generatedProjects.flatMap((project) =>
  buildEvmData(project, generatedProjectScenarios[project.id]),
);

export const generatedGanttDataByProject = generatedProjects.reduce<Record<string, GanttData>>(
  (acc, project) => {
    acc[project.id] = buildGanttData(project, generatedProjectScenarios[project.id]);
    return acc;
  },
  {},
);

export const generatedDocumentDataByProject = generatedProjects.reduce<Record<string, DocumentData>>(
  (acc, project) => {
    acc[project.id] = buildDocumentData(project, generatedProjectScenarios[project.id]);
    return acc;
  },
  {},
);

export function getGeneratedDocumentData(projectId: string) {
  return generatedDocumentDataByProject[projectId];
}

export function getGeneratedGanttData(projectId: string) {
  return generatedGanttDataByProject[projectId];
}

export function hasGeneratedProjectData(projectId: string) {
  return projectId in generatedProjectScenarios;
}

export function getGeneratedProject(projectId: string) {
  return getProject(projectId);
}
