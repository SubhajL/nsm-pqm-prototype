'use client';

import { useMemo } from 'react';
import { TreeSelect } from 'antd';
import type { DefaultOptionType } from 'antd/es/select';

import type { OrgUnit } from '@/types/admin';

/**
 * Reusable picker for selecting an org unit from PR-17's multi-tier RID
 * tree. Wraps AntD's `<TreeSelect>` so any node (department / bureau /
 * regional_office / construction_office / provincial_office / om_project /
 * basin) can be chosen — not just top-level entries.
 *
 * Driven by the flat org-unit list (the same data the admin page already
 * fetches via `useOrgStructure`). The tree shape is computed in-place so the
 * picker stays a single self-contained component.
 */

export interface OrgUnitTreePickerProps {
  /** Flat list of org units; the picker derives the tree internally. */
  units: OrgUnit[];
  /** Currently selected unit id. */
  value?: string | null;
  /** Called when the user selects a different unit. */
  onChange?: (value: string | null) => void;
  /** Optional placeholder shown when no value is selected. */
  placeholder?: string;
  /** Disable picker. */
  disabled?: boolean;
  /** Accessible label forwarded to the underlying TreeSelect. */
  ariaLabel?: string;
}

interface OrgTreeNode extends DefaultOptionType {
  value: string;
  title: string;
  children?: OrgTreeNode[];
}

function buildTreeData(units: OrgUnit[]): OrgTreeNode[] {
  const nodeById = new Map<string, OrgTreeNode>();
  const roots: OrgTreeNode[] = [];

  for (const unit of units) {
    nodeById.set(unit.id, {
      value: unit.id,
      title: unit.nameEn ? `${unit.name} (${unit.nameEn})` : unit.name,
      children: [],
    });
  }

  for (const unit of units) {
    const node = nodeById.get(unit.id)!;
    if (unit.parentId && nodeById.has(unit.parentId)) {
      const parent = nodeById.get(unit.parentId)!;
      parent.children!.push(node);
    } else {
      roots.push(node);
    }
  }

  return roots;
}

export function OrgUnitTreePicker({
  units,
  value,
  onChange,
  placeholder = 'เลือกหน่วยงาน',
  disabled,
  ariaLabel,
}: OrgUnitTreePickerProps) {
  const treeData = useMemo(() => buildTreeData(units), [units]);

  return (
    <TreeSelect<string>
      aria-label={ariaLabel}
      value={value ?? undefined}
      onChange={(next) => onChange?.(next ?? null)}
      treeData={treeData}
      treeDefaultExpandAll
      showSearch
      treeNodeFilterProp="title"
      placeholder={placeholder}
      disabled={disabled}
      allowClear
      style={{ width: '100%' }}
    />
  );
}
