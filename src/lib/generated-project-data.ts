import seedProjects from '@/data/projects.json';
import seedUsers from '@/data/users.json';
import seedMemberships from '@/data/project-memberships.json';
import proj002Scenario from '@/data/generated/scenarios/proj-002.json';
import proj003Scenario from '@/data/generated/scenarios/proj-003.json';
import proj004Scenario from '@/data/generated/scenarios/proj-004.json';
import proj005Scenario from '@/data/generated/scenarios/proj-005.json';
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
      { type: project.projectClass === 'research' ? 'นักวิจัยภาคสนาม (Field Researcher)' : 'คนงานทั่วไป (General)', count: project.projectClass === 'research' ? 4 : 8 },
    ],
    totalPersonnel: project.projectClass === 'research' ? 7 : 12,
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
    // PR-27 — generated scenarios pre-date the impact-analysis fields;
    // default to zero deltas + empty scope text. Approved fixtures back-
    // fill the chain with the manager so the audit trail isn't blank.
    impactScheduleDays: request.scheduleImpact,
    impactBudgetTHB: request.budgetImpact,
    impactScope: '',
    approvedByChain:
      request.status === 'approved' ? [request.approvedBy ?? contacts.manager] : [],
    rejectedReason: request.status === 'rejected' ? 'ไม่ระบุเหตุผล' : null,
    decidedAt:
      request.status === 'approved' || request.status === 'rejected'
        ? request.approvedAt ?? request.requestedAt
        : null,
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
  'proj-002': proj002Scenario as ScenarioConfig,
  'proj-003': proj003Scenario as ScenarioConfig,
  'proj-004': proj004Scenario as ScenarioConfig,
  'proj-005': proj005Scenario as ScenarioConfig,
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
