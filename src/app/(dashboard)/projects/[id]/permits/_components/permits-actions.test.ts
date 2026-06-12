import { describe, expect, it } from 'vitest';

import { PERMIT_STATUS_LABELS, type PermitStatus } from '@/types/permit';

import { canManageCompliance, statusCountEntries } from './permits-actions';

describe('canManageCompliance', () => {
  it('allows System Admin and Project Manager only', () => {
    expect(canManageCompliance('System Admin')).toBe(true);
    expect(canManageCompliance('Project Manager')).toBe(true);
    expect(canManageCompliance('Engineer')).toBe(false);
    expect(canManageCompliance('Coordinator')).toBe(false);
    expect(canManageCompliance(null)).toBe(false);
    expect(canManageCompliance(undefined)).toBe(false);
  });
});

describe('statusCountEntries', () => {
  const records: { status: PermitStatus }[] = [
    { status: 'issued' },
    { status: 'issued' },
    { status: 'submitted' },
    { status: 'expired' },
  ];

  it('returns bilingual count entries in label-map key order, skipping zero counts', () => {
    const entries = statusCountEntries(
      records,
      (record) => record.status,
      PERMIT_STATUS_LABELS,
    );
    expect(entries).toEqual([
      { key: 'submitted', label: 'ยื่นแล้ว (Submitted)', count: 1, color: 'processing' },
      { key: 'issued', label: 'อนุมัติแล้ว (Issued)', count: 2, color: 'success' },
      { key: 'expired', label: 'หมดอายุ (Expired)', count: 1, color: 'warning' },
    ]);
  });

  it('returns an empty list for no records', () => {
    expect(statusCountEntries([], (r: { status: PermitStatus }) => r.status, PERMIT_STATUS_LABELS)).toEqual([]);
  });
});
