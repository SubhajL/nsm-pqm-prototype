import { COLORS } from '@/theme/antd-theme';
import type { Issue, IssueStatus } from '@/types/risk';

export const EMPTY_ISSUES: Issue[] = [];

export const KANBAN_COLUMNS: { key: IssueStatus; label: string; headerColor: string }[] = [
  { key: 'open', label: 'เปิด (Open)', headerColor: COLORS.warning },
  { key: 'in_progress', label: 'กำลังแก้ไข (In Progress)', headerColor: COLORS.info },
  { key: 'review', label: 'รอตรวจสอบ (Review)', headerColor: COLORS.accentTeal },
  { key: 'closed', label: 'ปิดแล้ว (Closed)', headerColor: COLORS.success },
];

export const SEVERITY_BORDER_COLOR: Record<string, string> = {
  high: COLORS.error,
  medium: COLORS.warning,
  low: COLORS.success,
};

export type IssueDestination = {
  href: string;
  label: string;
};

function hasIssueTag(issue: Issue, targetTag: string) {
  return (issue.tags ?? []).some((tag) => tag.toLocaleLowerCase() === targetTag.toLocaleLowerCase());
}

export function getIssueDestination(issue: Issue, projectId: string): IssueDestination {
  if (
    issue.sourceInspectionId ||
    issue.sourceType === 'quality_auto_ncr' ||
    hasIssueTag(issue, 'NCR') ||
    hasIssueTag(issue, 'QC')
  ) {
    return {
      href: issue.sourceInspectionId
        ? `/projects/${projectId}/quality/inspection/${issue.sourceInspectionId}`
        : `/projects/${projectId}/quality`,
      label: issue.sourceInspectionId
        ? 'ผลตรวจคุณภาพ (Inspection Detail)'
        : 'คุณภาพ (Quality)',
    };
  }

  if (
    issue.sourceRiskId ||
    issue.sourceType === 'risk_mitigation' ||
    hasIssueTag(issue, 'RISK') ||
    hasIssueTag(issue, 'MITIGATION')
  ) {
    return {
      href: `/projects/${projectId}/risk`,
      label: 'ความเสี่ยง (Risk)',
    };
  }

  if (issue.linkedWbs.trim() && issue.linkedWbs !== '-') {
    return {
      href: `/projects/${projectId}/wbs`,
      label: 'WBS/BOQ',
    };
  }

  return {
    href: `/projects/${projectId}`,
    label: 'ภาพรวมโครงการ (Overview)',
  };
}

export function computeSlaStatus(issue: Issue): { text: string; overdue: boolean } {
  if (issue.closedAt) {
    return { text: 'แก้ไขแล้ว', overdue: false };
  }
  const created = new Date(issue.createdAt).getTime();
  const deadline = created + issue.slaHours * 60 * 60 * 1000;
  const now = new Date('2026-07-15T12:00:00').getTime(); // current demo date
  const remainMs = deadline - now;

  if (remainMs < 0) {
    const overdueHrs = Math.abs(Math.round(remainMs / (1000 * 60 * 60)));
    return { text: `เกิน SLA ${overdueHrs} ชม.`, overdue: true };
  }

  const remainHrs = Math.round(remainMs / (1000 * 60 * 60));
  if (remainHrs > 24) {
    const days = Math.floor(remainHrs / 24);
    return { text: `เหลือ ${days} วัน`, overdue: false };
  }
  return { text: `เหลือ ${remainHrs} ชม.`, overdue: remainHrs < 8 };
}
