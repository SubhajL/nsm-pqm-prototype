import { describe, expect, it } from 'vitest';

import {
  createChangeRequestRequestSchema,
  decideChangeRequestRequestSchema,
  documentDeleteRequestSchema,
  documentWriteRequestSchema,
} from './document.schema';

describe('documentWriteRequestSchema (discriminated union)', () => {
  it('accepts a folder-create body', () => {
    const result = documentWriteRequestSchema.safeParse({
      kind: 'folder',
      name: 'สัญญาและ TOR',
      parentId: null,
    });
    expect(result.success).toBe(true);
  });

  it('accepts a file-create body', () => {
    const result = documentWriteRequestSchema.safeParse({
      kind: 'file',
      folderId: 'folder-123',
      name: 'report.pdf',
      type: 'PDF',
      size: '2.4 MB',
    });
    expect(result.success).toBe(true);
  });

  it('accepts a version-upload body', () => {
    const result = documentWriteRequestSchema.safeParse({
      kind: 'version',
      fileId: 'file-abc',
      note: 'แก้ไขรายละเอียดงวด 2',
    });
    expect(result.success).toBe(true);
  });

  it('rejects an unknown kind', () => {
    const result = documentWriteRequestSchema.safeParse({
      kind: 'mystery',
      name: 'x',
    });
    expect(result.success).toBe(false);
  });

  it('rejects a folder body missing name', () => {
    const result = documentWriteRequestSchema.safeParse({
      kind: 'folder',
      parentId: null,
    });
    expect(result.success).toBe(false);
  });

  it('rejects a file body with a non-string size', () => {
    const result = documentWriteRequestSchema.safeParse({
      kind: 'file',
      folderId: 'f1',
      name: 'a',
      type: 'PDF',
      size: 99,
    });
    expect(result.success).toBe(false);
  });
});

describe('documentDeleteRequestSchema', () => {
  it('accepts a valid folder delete', () => {
    const result = documentDeleteRequestSchema.safeParse({
      kind: 'folder',
      id: 'folder-1',
    });
    expect(result.success).toBe(true);
  });

  it('rejects a delete missing id', () => {
    const result = documentDeleteRequestSchema.safeParse({ kind: 'file' });
    expect(result.success).toBe(false);
  });
});

describe('change-request schemas', () => {
  it('accepts a create payload with all required fields', () => {
    const result = createChangeRequestRequestSchema.safeParse({
      projectId: 'PJ-2569-0012',
      title: 'เพิ่มงานติดตั้งไฟ',
      reason: 'ลูกค้าขอเพิ่ม',
      budgetImpact: 250_000,
      scheduleImpact: 14,
      linkedWbs: 'WBS 3.2',
      priority: 'high',
    });
    expect(result.success).toBe(true);
  });

  it('rejects a create payload with an unknown priority', () => {
    const result = createChangeRequestRequestSchema.safeParse({
      projectId: 'PJ-2569-0012',
      title: 'x',
      reason: 'x',
      budgetImpact: 0,
      scheduleImpact: 0,
      linkedWbs: '-',
      priority: 'urgent',
    });
    expect(result.success).toBe(false);
  });

  it('accepts approve / reject / return actions on decide', () => {
    for (const action of ['approve', 'reject', 'return'] as const) {
      const result = decideChangeRequestRequestSchema.safeParse({
        id: 'CR-ABCDEF12',
        action,
      });
      expect(result.success).toBe(true);
    }
  });

  it('rejects an unknown decide action', () => {
    const result = decideChangeRequestRequestSchema.safeParse({
      id: 'CR-1',
      action: 'destroy',
    });
    expect(result.success).toBe(false);
  });
});
