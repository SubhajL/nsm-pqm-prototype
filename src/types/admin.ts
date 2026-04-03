export type UserRole =
  | 'System Admin'
  | 'Project Manager'
  | 'Engineer'
  | 'Coordinator'
  | 'Team Member'
  | 'Executive'
  | 'Consultant';

export interface User {
  id: string;
  name: string;
  position: string;
  role: UserRole;
  department: string;
  departmentId: string;
  status: 'active' | 'suspended';
  projectCount: number;
  email: string;
  phone: string;
}

export interface OrgUnit {
  id: string;
  name: string;
  nameEn: string;
  parentId: string | null;
  userCount: number;
}

export interface AuditLog {
  id: string;
  userId: string;
  userName: string;
  ip: string;
  os: string;
  module: string;
  action: string;
  timestamp: string;
}

export const MODULE_COLORS: Record<string, string> = {
  Task: 'blue',
  'Daily Report': 'cyan',
  Login: 'green',
  Document: 'purple',
  Risk: 'red',
  Quality: 'orange',
  Approval: 'green',
  Issue: 'red',
  Team: 'blue',
};
