'use client';

import { Badge, Tag, Typography } from 'antd';
import type { DataNode } from 'antd/es/tree';
import { ApartmentOutlined } from '@ant-design/icons';

import { COLORS } from '@/theme/antd-theme';
import type { OrgUnit, OrgUnitWithUserCount, User } from '@/types/admin';
import type {
  ProjectSizeTier,
  RidOrgUnitKind,
} from '@/types/rid/vocabulary';

const { Text } = Typography;

// Distributive Omit preserves each discriminated-union branch separately —
// without it, `Omit<OrgUnit, 'id'>` would drop the construction_office
// branch's `constructionTier` qualifier when building the payload.
export type DistributiveOmit<T, K extends keyof T> = T extends unknown ? Omit<T, K> : never;

// PR-17: Thai labels for each RID org-unit kind, used in badges and form
// dropdowns. Keys are exhaustively typed against `RidOrgUnitKind` so a new
// kind in the vocabulary will surface as a TS error here.
export const ORG_KIND_LABELS: Record<RidOrgUnitKind, string> = {
  department: 'กรม (Department)',
  bureau: 'สำนัก/กอง (Bureau)',
  regional_office: 'สำนักงานชลประทาน (Regional)',
  construction_office: 'สำนักงานก่อสร้าง (Construction)',
  provincial_office: 'โครงการชลประทานจังหวัด (Provincial)',
  om_project: 'โครงการส่งน้ำและบำรุงรักษา (O&M)',
  basin: 'ลุ่มน้ำ (Basin)',
};

export const ORG_KIND_BADGE_COLORS: Record<RidOrgUnitKind, string> = {
  department: 'magenta',
  bureau: 'blue',
  regional_office: 'geekblue',
  construction_office: 'gold',
  provincial_office: 'cyan',
  om_project: 'green',
  basin: 'purple',
};

export const CONSTRUCTION_TIER_LABELS: Record<ProjectSizeTier, string> = {
  small: 'ขนาดเล็ก (Small)',
  medium: 'ขนาดกลาง (Medium)',
  large: 'ขนาดใหญ่ (Large)',
};

export const ROLE_COLORS: Record<string, string> = {
  'System Admin': 'red',
  'Project Manager': 'blue',
  Engineer: 'geekblue',
  Coordinator: 'cyan',
  'Team Member': 'default',
  Executive: 'purple',
  Consultant: 'orange',
};

export interface OrgUnitFormValues {
  kind: RidOrgUnitKind;
  name: string;
  nameEn: string | null;
  parentId: string | null;
  costCenter: string | null;
  constructionTier?: ProjectSizeTier | null;
}

export interface UserFormValues {
  name: string;
  position: string;
  role: User['role'];
  departmentId: string;
  email: string;
  phone: string;
}

export function buildTree(units: OrgUnitWithUserCount[]): DataNode[] {
  const map = new Map<string, DataNode>();
  const roots: DataNode[] = [];

  units.forEach((unit) => {
    map.set(unit.id, {
      key: unit.id,
      title: (
        <span>
          <ApartmentOutlined style={{ marginRight: 6, color: COLORS.accentTeal }} />
          {unit.name}
          {unit.nameEn ? (
            <Text type="secondary" style={{ marginLeft: 4, fontSize: 12 }}>
              ({unit.nameEn})
            </Text>
          ) : null}
          <Tag
            color={ORG_KIND_BADGE_COLORS[unit.kind]}
            style={{ marginLeft: 6, fontSize: 11 }}
          >
            {ORG_KIND_LABELS[unit.kind]}
          </Tag>
          {unit.costCenter ? (
            <Tag color="default" style={{ marginLeft: 4, fontSize: 11 }}>
              CC: {unit.costCenter}
            </Tag>
          ) : null}{' '}
          <Badge
            count={unit.userCount}
            style={{ backgroundColor: COLORS.accentTeal, marginLeft: 4 }}
            size="small"
          />
        </span>
      ),
      children: [],
    });
  });

  units.forEach((unit) => {
    const node = map.get(unit.id)!;
    if (unit.parentId && map.has(unit.parentId)) {
      const parent = map.get(unit.parentId)!;
      (parent.children as DataNode[]).push(node);
    } else if (!unit.parentId) {
      roots.push(node);
    }
  });

  return roots;
}

export type { OrgUnit, OrgUnitWithUserCount, User };
