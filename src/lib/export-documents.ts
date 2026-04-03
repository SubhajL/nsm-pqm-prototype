import {
  formatBaht,
  formatPercent,
  formatThaiDate,
  formatThaiDateShort,
} from '@/lib/date-utils';
import {
  type DerivedEvmMetrics,
  getPaidToDate,
} from '@/lib/evm-metrics';
import {
  deriveTaskScheduleHealth,
  getScheduleEvaluationDate,
} from '@/lib/project-progress-derivations';
import type { BOQItem } from '@/hooks/useBOQ';
import type { WBSNode } from '@/hooks/useWBS';
import type { EVMDataPoint } from '@/types/evm';
import type { GanttData } from '@/types/gantt';
import {
  PROJECT_EXECUTION_MODEL_LABELS,
  PROJECT_STATUS_LABELS,
  PROJECT_TYPE_LABELS,
  type Project,
} from '@/types/project';
import { RISK_LEVEL_LABELS, RISK_STATUS_LABELS, type Risk } from '@/types/risk';
import type { OrgUnit, User } from '@/types/admin';
import type { ExportDocument } from '@/lib/export-utils';

function makeFilename(parts: string[], extension: string) {
  const stem = parts
    .join('-')
    .toLocaleLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'export';

  return `${stem}.${extension}`;
}

function getProjectDisplayStatus(project: Pick<Project, 'status' | 'scheduleHealth'>) {
  if (project.status !== 'in_progress') {
    return project.status;
  }

  return project.scheduleHealth ?? 'on_schedule';
}

export function buildExecutiveExportDocument(projects: Project[]): ExportDocument {
  const totalBudget = projects.reduce((sum, project) => sum + project.budget, 0);
  const activeProjects = projects.filter((project) => project.status === 'in_progress').length;
  const delayedProjects = projects.filter(
    (project) => getProjectDisplayStatus(project) === 'delayed',
  ).length;
  const completedProjects = projects.filter((project) => project.status === 'completed').length;

  return {
    title: 'Executive Dashboard Briefing',
    subtitle: 'สรุปภาพรวมโครงการสำหรับผู้บริหาร',
    filename: makeFilename(['executive-dashboard-briefing'], 'pdf'),
    orientation: 'landscape',
    metadata: [
      { label: 'จำนวนโครงการทั้งหมด', value: String(projects.length) },
      { label: 'โครงการที่กำลังดำเนินการ', value: String(activeProjects) },
      { label: 'มูลค่างบประมาณรวม', value: `${formatBaht(totalBudget)} ฿` },
    ],
    summaries: [
      { label: 'Total Projects', value: String(projects.length), tone: 'neutral' },
      { label: 'Active', value: String(activeProjects), tone: 'success' },
      { label: 'Delayed', value: String(delayedProjects), tone: 'danger' },
      { label: 'Completed', value: String(completedProjects), tone: 'success' },
    ],
    tables: [
      {
        title: 'Portfolio Status',
        columns: ['โครงการ', 'ประเภท', 'สถานะ', 'ความคืบหน้า', 'งบประมาณ', 'PM'],
        rows: projects.map((project) => [
          project.name,
          PROJECT_TYPE_LABELS[project.type]?.en ?? project.type,
          PROJECT_STATUS_LABELS[project.status]?.en ?? project.status,
          formatPercent(project.progress),
          `${formatBaht(project.budget)} ฿`,
          project.managerName,
        ]),
      },
      {
        title: 'Budget Snapshot',
        columns: ['โครงการ', 'เบิกจ่ายประมาณการ', 'งบประมาณทั้งหมด', 'สัดส่วน'],
        rows: projects.map((project) => {
          const spent = Math.round(project.budget * project.progress);
          return [
            project.name,
            `${formatBaht(spent)} ฿`,
            `${formatBaht(project.budget)} ฿`,
            formatPercent(project.progress),
          ];
        }),
      },
    ],
    notes: [
      'เอกสารนี้ออกแบบสำหรับพิมพ์หรือ Save as PDF จากเบราว์เซอร์',
    ],
  };
}

export function buildWbsExportDocument(options: {
  project: Project | undefined;
  wbsNodes: WBSNode[];
  selectedNodeName: string;
  boqItems: BOQItem[];
  stats: { level1: number; level2: number; milestones: number };
  isOutsourced: boolean;
}): ExportDocument {
  const { project, wbsNodes, selectedNodeName, boqItems, stats, isOutsourced } = options;
  const boqTotal = boqItems.reduce((sum, item) => sum + item.total, 0);

  return {
    title: 'WBS & BOQ Export',
    subtitle: project?.name ?? 'รายละเอียดโครงการ',
    filename: makeFilename(['wbs-boq', project?.id ?? 'project'], 'xls'),
    orientation: 'landscape',
    metadata: [
      { label: 'รหัสโครงการ', value: project?.code ?? '-' },
      { label: 'Execution', value: project ? PROJECT_EXECUTION_MODEL_LABELS[project.executionModel].en : '-' },
      { label: 'Selected BOQ Context', value: selectedNodeName || 'ไม่มีโหนดที่เลือก' },
    ],
    summaries: [
      { label: 'ระดับ 1', value: String(stats.level1) },
      { label: 'ระดับ 2', value: String(stats.level2) },
      { label: 'Milestones', value: String(stats.milestones) },
      { label: 'BOQ รวมบริบทที่เลือก', value: `${formatBaht(boqTotal)} ฿`, tone: 'success' },
    ],
    tables: [
      {
        title: 'WBS Hierarchy',
        columns: ['Code', 'Name', 'Level', 'Weight', 'Progress', 'มี BOQ'],
        rows: wbsNodes.map((node) => [
          node.code,
          node.name,
          String(node.level),
          `${node.weight}%`,
          `${node.progress}%`,
          node.hasBOQ ? 'Yes' : 'No',
        ]),
        emptyMessage: 'ไม่มีข้อมูล WBS',
      },
      {
        title: selectedNodeName ? `BOQ - ${selectedNodeName}` : 'BOQ Detail',
        columns: ['Description', 'Qty', 'Unit', 'Unit Price', 'Total'],
        rows: boqItems.map((item) => [
          item.description,
          formatBaht(item.quantity),
          item.unit,
          `${formatBaht(item.unitPrice)} ฿`,
          `${formatBaht(item.total)} ฿`,
        ]),
        emptyMessage: 'ไม่มีรายการ BOQ สำหรับโหนดที่เลือก',
      },
    ],
    notes: isOutsourced
      ? ['โครงการจ้างภายนอกแสดง BOQ ในโหมดอ่านอย่างเดียวบนหน้าจอ WBS']
      : undefined,
  };
}

export function buildGanttExportDocument(options: {
  project: Project | undefined;
  ganttData: GanttData | undefined;
  viewMode: string;
  timeScale: string;
}): ExportDocument {
  const tasks = options.ganttData?.data ?? [];
  const evaluationDate = getScheduleEvaluationDate().format('YYYY-MM-DD');

  return {
    title: 'Gantt Schedule Report',
    subtitle: options.project?.name ?? 'รายละเอียดโครงการ',
    filename: makeFilename(['gantt-schedule', options.project?.id ?? 'project'], 'pdf'),
    orientation: 'landscape',
    metadata: [
      { label: 'โหมดมุมมอง', value: options.viewMode },
      { label: 'Time Scale', value: options.timeScale },
      { label: 'วันที่ประเมินสถานะ', value: formatThaiDate(evaluationDate) },
      { label: 'จำนวนกิจกรรม', value: String(tasks.length) },
    ],
    summaries: [
      { label: 'Tasks', value: String(tasks.filter((task) => task.type === 'task').length) },
      { label: 'Milestones', value: String(tasks.filter((task) => task.type === 'milestone').length) },
      { label: 'Links', value: String(options.ganttData?.links.length ?? 0) },
    ],
    tables: [
      {
        title: 'Schedule Register',
        columns: ['Activity', 'Owner', 'Type', 'Start', 'End', 'Progress', 'Schedule Health'],
        rows: tasks.map((task) => [
          task.text,
          task.owner || '-',
          task.type,
          formatThaiDateShort(task.start_date),
          formatThaiDateShort(task.end_date),
          `${Math.round(task.progress * 100)}%`,
          task.type === 'task'
            ? deriveTaskScheduleHealth(task, getScheduleEvaluationDate()).replaceAll('_', ' ')
            : '-',
        ]),
        emptyMessage: 'ไม่มีข้อมูลแผนงาน',
      },
    ],
  };
}

export function buildEvmPdfDocument(options: {
  project: Project;
  evmData: EVMDataPoint[];
  metrics: DerivedEvmMetrics | null;
}): ExportDocument {
  const executionLabel = PROJECT_EXECUTION_MODEL_LABELS[options.project.executionModel];

  return {
    title: 'EVM Dashboard Report',
    subtitle: options.project.name,
    filename: makeFilename(['evm-dashboard', options.project.id], 'pdf'),
    orientation: 'landscape',
    metadata: [
      { label: 'Project Code', value: options.project.code },
      { label: 'Execution', value: executionLabel.en },
      { label: 'BAC', value: `${formatBaht(options.project.budget)} ฿` },
    ],
    summaries: options.metrics
      ? [
          { label: 'SPI', value: options.metrics.spi.toFixed(2), tone: options.metrics.spi >= 1 ? 'success' : 'warning' },
          {
            label: options.metrics.mode === 'internal' ? 'CPI' : 'Paid/BAC',
            value:
              options.metrics.mode === 'internal'
                ? options.metrics.cpi.toFixed(2)
                : `${options.metrics.paidPercent.toFixed(1)}%`,
            tone: 'neutral',
          },
          { label: 'EV', value: `${formatBaht(options.metrics.ev)} ฿`, tone: 'neutral' },
          {
            label: options.metrics.mode === 'internal' ? 'AC' : 'Paid to Date',
            value: `${formatBaht(options.metrics.mode === 'internal' ? options.metrics.ac : options.metrics.paidToDate)} ฿`,
            tone: 'neutral',
          },
        ]
      : [{ label: 'Snapshots', value: '0', tone: 'warning' }],
    tables: [
      {
        title: 'EVM Snapshot Table',
        columns: ['งวด', 'PV', 'EV', options.project.executionModel === 'outsourced' ? 'Paid' : 'AC', 'SPI', options.project.executionModel === 'outsourced' ? 'Paid/BAC' : 'CPI'],
        rows: options.evmData.map((point) => [
          point.monthThai,
          `${formatBaht(point.pv)} ฿`,
          `${formatBaht(point.ev)} ฿`,
          `${formatBaht(options.project.executionModel === 'outsourced' ? getPaidToDate(point) : point.ac)} ฿`,
          point.spi.toFixed(2),
          options.project.executionModel === 'outsourced'
            ? `${((getPaidToDate(point) / Math.max(options.project.budget, 1)) * 100).toFixed(1)}%`
            : point.cpi.toFixed(2),
        ]),
        emptyMessage: 'ยังไม่มีข้อมูลงวด EVM',
      },
    ],
  };
}

export function buildEvmExcelDocument(options: {
  project: Project;
  evmData: EVMDataPoint[];
  metrics: DerivedEvmMetrics | null;
}): ExportDocument {
  const summaryRows = options.metrics
    ? [
        ['BAC', `${formatBaht(options.metrics.bac)} ฿`],
        ['PV', `${formatBaht(options.metrics.pv)} ฿`],
        ['EV', `${formatBaht(options.metrics.ev)} ฿`],
        [
          options.metrics.mode === 'internal' ? 'AC' : 'Paid to Date',
          `${formatBaht(options.metrics.mode === 'internal' ? options.metrics.ac : options.metrics.paidToDate)} ฿`,
        ],
        ['SPI', options.metrics.spi.toFixed(2)],
      ]
    : [];

  return {
    title: 'EVM Spreadsheet Export',
    subtitle: options.project.name,
    filename: makeFilename(['evm', options.project.id], 'xls'),
    orientation: 'landscape',
    metadata: [
      { label: 'Project Code', value: options.project.code },
      { label: 'Execution', value: PROJECT_EXECUTION_MODEL_LABELS[options.project.executionModel].en },
    ],
    tables: [
      {
        title: 'Summary',
        columns: ['Metric', 'Value'],
        rows: summaryRows,
        emptyMessage: 'ยังไม่มีข้อมูลสรุป EVM',
      },
      {
        title: 'Time Series',
        columns: ['Month', 'PV', 'EV', options.project.executionModel === 'outsourced' ? 'Paid' : 'AC', 'SPI', options.project.executionModel === 'outsourced' ? 'Paid/BAC' : 'CPI'],
        rows: options.evmData.map((point) => [
          point.monthThai,
          String(point.pv),
          String(point.ev),
          String(options.project.executionModel === 'outsourced' ? getPaidToDate(point) : point.ac),
          point.spi.toFixed(2),
          options.project.executionModel === 'outsourced'
            ? ((getPaidToDate(point) / Math.max(options.project.budget, 1)) * 100).toFixed(1)
            : point.cpi.toFixed(2),
        ]),
        emptyMessage: 'ยังไม่มีข้อมูลงวด EVM',
      },
    ],
  };
}

export function buildRiskPdfDocument(options: {
  project: Project | undefined;
  filteredRisks: Risk[];
  stats: { total: number; criticalHigh: number; medium: number; closed: number; open: number; mitigating: number };
  searchText: string;
}): ExportDocument {
  return {
    title: 'Risk Register Report',
    subtitle: options.project?.name ?? 'รายละเอียดโครงการ',
    filename: makeFilename(['risk-register', options.project?.id ?? 'project'], 'pdf'),
    orientation: 'landscape',
    metadata: [
      { label: 'Search Filter', value: options.searchText || 'ทั้งหมด' },
      { label: 'Risks in Export', value: String(options.filteredRisks.length) },
    ],
    summaries: [
      { label: 'Total', value: String(options.stats.total) },
      { label: 'Critical/High', value: String(options.stats.criticalHigh), tone: 'danger' },
      { label: 'Mitigating', value: String(options.stats.mitigating), tone: 'warning' },
      { label: 'Closed', value: String(options.stats.closed), tone: 'success' },
    ],
    tables: [
      {
        title: 'Risk Register',
        columns: ['ID', 'Title', 'Impact', 'Likelihood', 'Level', 'Status', 'Owner', 'Date'],
        rows: options.filteredRisks.map((risk) => [
          risk.id,
          risk.title,
          String(risk.impact),
          String(risk.likelihood),
          RISK_LEVEL_LABELS[risk.level].en,
          RISK_STATUS_LABELS[risk.status].en,
          risk.owner,
          formatThaiDate(risk.dateIdentified),
        ]),
        emptyMessage: 'ไม่พบข้อมูลความเสี่ยงตามเงื่อนไข',
      },
    ],
  };
}

export function buildRiskExcelDocument(options: {
  project: Project | undefined;
  filteredRisks: Risk[];
  searchText: string;
}): ExportDocument {
  return {
    title: 'Risk Register Spreadsheet',
    subtitle: options.project?.name ?? 'รายละเอียดโครงการ',
    filename: makeFilename(['risk-register', options.project?.id ?? 'project'], 'xls'),
    orientation: 'landscape',
    metadata: [
      { label: 'Search Filter', value: options.searchText || 'ทั้งหมด' },
    ],
    tables: [
      {
        title: 'Risk Register',
        columns: ['ID', 'Title', 'Description', 'Impact', 'Likelihood', 'Score', 'Level', 'Status', 'Owner', 'Date Identified', 'Mitigation'],
        rows: options.filteredRisks.map((risk) => [
          risk.id,
          risk.title,
          risk.description,
          String(risk.impact),
          String(risk.likelihood),
          String(risk.score),
          RISK_LEVEL_LABELS[risk.level].en,
          RISK_STATUS_LABELS[risk.status].en,
          risk.owner,
          risk.dateIdentified,
          risk.mitigation,
        ]),
        emptyMessage: 'ไม่พบข้อมูลความเสี่ยงตามเงื่อนไข',
      },
    ],
  };
}

export function buildAdminUserExportDocument(options: {
  department: OrgUnit | null;
  users: User[];
}): ExportDocument {
  return {
    title: 'Department User Roster',
    subtitle: options.department?.name ?? 'รายการผู้ใช้งาน',
    filename: makeFilename(['users', options.department?.id ?? 'department'], 'xls'),
    metadata: [
      { label: 'หน่วยงาน', value: options.department?.name ?? '-' },
      { label: 'ชื่อภาษาอังกฤษ', value: options.department?.nameEn ?? '-' },
      { label: 'จำนวนผู้ใช้งาน', value: String(options.users.length) },
    ],
    tables: [
      {
        title: 'User List',
        columns: ['Name', 'Position', 'Role', 'Status', 'Email', 'Phone', 'Project Count'],
        rows: options.users.map((user) => [
          user.name,
          user.position,
          user.role,
          user.status,
          user.email,
          user.phone,
          String(user.projectCount),
        ]),
        emptyMessage: 'ไม่มีผู้ใช้งานในหน่วยงานที่เลือก',
      },
    ],
  };
}
