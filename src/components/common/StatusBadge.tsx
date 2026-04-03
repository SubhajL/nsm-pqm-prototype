'use client';

import { Tag } from 'antd';
import { PROJECT_STATUS_COLORS } from '@/theme/antd-theme';

type StatusEntry = { label: string; color: string };

const PROJECT_STATUS: Record<string, StatusEntry> = {
  draft: { label: 'ร่าง (Draft)', color: 'default' },
  planning: { label: 'วางแผน (Planning)', color: PROJECT_STATUS_COLORS.planning },
  in_progress: { label: 'กำลังดำเนินการ (In Progress)', color: PROJECT_STATUS_COLORS.inProgress },
  not_started: { label: 'ยังไม่เริ่ม (Not Started)', color: 'default' },
  on_schedule: { label: 'ตามแผน (On Schedule)', color: 'green' },
  watch: { label: 'เฝ้าระวัง (Watch)', color: PROJECT_STATUS_COLORS.watch },
  delayed: { label: 'ล่าช้า (Delayed)', color: PROJECT_STATUS_COLORS.delayed },
  on_hold: { label: 'หยุดชั่วคราว (On Hold)', color: 'warning' },
  completed: { label: 'เสร็จสิ้น (Completed)', color: 'success' },
  cancelled: { label: 'ยกเลิก (Cancelled)', color: 'error' },
};

const MILESTONE_STATUS: Record<string, StatusEntry> = {
  pending: { label: 'รอดำเนินการ (Pending)', color: 'default' },
  in_progress: { label: 'กำลังดำเนินการ (In Progress)', color: 'processing' },
  review: { label: 'รอตรวจสอบ (Review)', color: 'warning' },
  completed: { label: 'เสร็จสิ้น (Completed)', color: 'success' },
};

const HEALTH_STATUS: Record<string, StatusEntry> = {
  normal: { label: 'ปกติ (On Track)', color: 'green' },
  warning: { label: 'เฝ้าระวัง (At Risk)', color: 'gold' },
  delayed: { label: 'ล่าช้า (Delayed)', color: 'red' },
};

const RISK_STATUS: Record<string, StatusEntry> = {
  open: { label: 'เปิด (Open)', color: 'error' },
  mitigating: { label: 'กำลังแก้ไข (Mitigating)', color: 'warning' },
  closed: { label: 'ปิด (Closed)', color: 'success' },
  accepted: { label: 'ยอมรับ (Accepted)', color: 'blue' },
};

const ISSUE_STATUS: Record<string, StatusEntry> = {
  open: { label: 'เปิด (Open)', color: 'error' },
  in_progress: { label: 'กำลังแก้ไข (In Progress)', color: 'processing' },
  resolved: { label: 'แก้ไขแล้ว (Resolved)', color: 'success' },
  closed: { label: 'ปิด (Closed)', color: 'default' },
};

const STATUS_MAPS: Record<string, Record<string, StatusEntry>> = {
  project: PROJECT_STATUS,
  milestone: MILESTONE_STATUS,
  health: HEALTH_STATUS,
  risk: RISK_STATUS,
  issue: ISSUE_STATUS,
};

interface StatusBadgeProps {
  status: string;
  type?: 'project' | 'milestone' | 'health' | 'risk' | 'issue';
}

export function StatusBadge({ status, type = 'project' }: StatusBadgeProps) {
  const map = STATUS_MAPS[type] ?? PROJECT_STATUS;
  const entry = map[status] ?? { label: status, color: 'default' };
  return <Tag color={entry.color}>{entry.label}</Tag>;
}
