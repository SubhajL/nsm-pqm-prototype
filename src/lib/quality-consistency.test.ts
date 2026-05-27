import { describe, expect, it } from 'vitest';

import {
  deriveItpStatusFromInspectionRecords,
  removeAutoNcrIssuesForInspection,
  synchronizeAutoNcrIssues,
  synchronizeItpStatuses,
} from '@/lib/quality-consistency';
import type {
  InspectionChecklistItem,
  InspectionRecord,
  InspectionsData,
  ITPItem,
  ITPStatus,
} from '@/types/quality';
import type { Issue } from '@/types/risk';

// ---------------------------------------------------------------------------
// Characterization tests: pin CURRENT behavior of quality-consistency exports.
// ---------------------------------------------------------------------------

function makeItp(overrides: Partial<ITPItem>): ITPItem {
  return {
    id: overrides.id ?? 'ITP-1',
    projectId: overrides.projectId ?? 'P-TEST',
    sequence: overrides.sequence ?? 1,
    item: overrides.item ?? 'Concrete pour',
    standard: overrides.standard ?? '',
    inspectionType: overrides.inspectionType ?? 'H',
    inspector: overrides.inspector ?? 'inspector',
    status: overrides.status ?? 'pending',
  };
}

function makeChecklistItem(
  overrides: Partial<InspectionChecklistItem>,
): InspectionChecklistItem {
  return {
    id: overrides.id ?? 'C1',
    item: overrides.item ?? 'Slump',
    criteria: overrides.criteria ?? '',
    result: overrides.result ?? 'pass',
    note: overrides.note ?? '',
  };
}

function makeRecord(overrides: Partial<InspectionRecord>): InspectionRecord {
  return {
    id: overrides.id ?? 'INS-1',
    projectId: overrides.projectId ?? 'P-TEST',
    itpId: overrides.itpId ?? 'ITP-1',
    title: overrides.title ?? 'Inspection',
    date: overrides.date ?? '2026-02-01',
    time: overrides.time ?? '09:00',
    inspectors: overrides.inspectors ?? ['inspector1'],
    wbsLink: overrides.wbsLink ?? '1.1',
    standards: overrides.standards ?? [],
    checklist: overrides.checklist ?? [],
    overallResult: overrides.overallResult ?? 'pass',
    failReason: overrides.failReason ?? '',
    autoNCR: overrides.autoNCR ?? false,
    workflowStatus: overrides.workflowStatus ?? 'signed',
  };
}

function makeIssue(overrides: Partial<Issue>): Issue {
  return {
    id: overrides.id ?? 'ISS-001',
    projectId: overrides.projectId ?? 'P-TEST',
    title: overrides.title ?? 'Existing',
    severity: overrides.severity ?? 'medium',
    status: overrides.status ?? 'open',
    assignee: overrides.assignee ?? 'assignee',
    linkedWbs: overrides.linkedWbs ?? '-',
    slaHours: overrides.slaHours ?? 48,
    tags: overrides.tags,
    sourceInspectionId: overrides.sourceInspectionId,
    sourceRiskId: overrides.sourceRiskId,
    sourceType: overrides.sourceType,
    createdAt: overrides.createdAt ?? '2026-01-01',
    closedAt: overrides.closedAt ?? null,
    progress: overrides.progress,
  };
}

describe('deriveItpStatusFromInspectionRecords', () => {
  it('returns the existing item status when no records are linked', () => {
    const item = makeItp({ id: 'ITP-X', status: 'awaiting' });
    const result: ITPStatus = deriveItpStatusFromInspectionRecords(item, []);
    expect(result).toBe('awaiting');
  });

  it('returns "passed" when the latest linked record overallResult === "pass"', () => {
    const item = makeItp({ id: 'ITP-1' });
    const records = [
      makeRecord({ id: 'INS-1', itpId: 'ITP-1', date: '2026-01-01', overallResult: 'fail' }),
      makeRecord({ id: 'INS-2', itpId: 'ITP-1', date: '2026-02-01', overallResult: 'pass' }),
    ];
    expect(deriveItpStatusFromInspectionRecords(item, records)).toBe('passed');
  });

  it('returns "conditional" when the latest linked record is not a pass', () => {
    const item = makeItp({ id: 'ITP-1' });
    const records = [
      makeRecord({ id: 'INS-1', itpId: 'ITP-1', date: '2026-01-01', overallResult: 'pass' }),
      makeRecord({ id: 'INS-2', itpId: 'ITP-1', date: '2026-02-01', overallResult: 'fail' }),
    ];
    expect(deriveItpStatusFromInspectionRecords(item, records)).toBe('conditional');
  });

  it('uses date+time to determine the latest record', () => {
    const item = makeItp({ id: 'ITP-1' });
    const records = [
      makeRecord({ id: 'INS-1', itpId: 'ITP-1', date: '2026-02-01', time: '15:00', overallResult: 'pass' }),
      makeRecord({ id: 'INS-2', itpId: 'ITP-1', date: '2026-02-01', time: '09:00', overallResult: 'fail' }),
    ];
    // Sorted ascending by timestamp; latest = the 15:00 record → 'passed'
    expect(deriveItpStatusFromInspectionRecords(item, records)).toBe('passed');
  });

  it('defaults missing time to "00:00" when sorting', () => {
    const item = makeItp({ id: 'ITP-1' });
    const records = [
      makeRecord({ id: 'INS-1', itpId: 'ITP-1', date: '2026-02-01', time: '   ', overallResult: 'fail' }),
      makeRecord({ id: 'INS-2', itpId: 'ITP-1', date: '2026-02-01', time: '01:00', overallResult: 'pass' }),
    ];
    expect(deriveItpStatusFromInspectionRecords(item, records)).toBe('passed');
  });

  it('ignores records for other ITP ids', () => {
    const item = makeItp({ id: 'ITP-1', status: 'pending' });
    const records = [
      makeRecord({ id: 'INS-1', itpId: 'ITP-OTHER', overallResult: 'fail' }),
    ];
    expect(deriveItpStatusFromInspectionRecords(item, records)).toBe('pending');
  });
});

describe('synchronizeItpStatuses', () => {
  it('mutates each ITP item status in place and returns the same data reference', () => {
    const data: InspectionsData = {
      itpItems: [
        makeItp({ id: 'ITP-1', status: 'pending' }),
        makeItp({ id: 'ITP-2', status: 'pending' }),
      ],
      inspectionRecords: [
        makeRecord({ id: 'INS-1', itpId: 'ITP-1', overallResult: 'pass' }),
        makeRecord({ id: 'INS-2', itpId: 'ITP-2', overallResult: 'fail' }),
      ],
    };
    const result = synchronizeItpStatuses(data);
    expect(result).toBe(data);
    expect(data.itpItems[0].status).toBe('passed');
    expect(data.itpItems[1].status).toBe('conditional');
  });
});

describe('synchronizeAutoNcrIssues — creating new issues', () => {
  it('creates a new issue per autoNCR=true inspection', () => {
    const issues: Issue[] = [];
    const records = [
      makeRecord({
        id: 'INS-1',
        autoNCR: true,
        checklist: [
          makeChecklistItem({ id: 'C1', item: 'Slump test', result: 'fail' }),
        ],
        inspectors: ['inspector_a'],
        wbsLink: '1.2.3',
        date: '2026-02-15',
      }),
    ];
    const result = synchronizeAutoNcrIssues(issues, records);
    expect(result).toHaveLength(1);
    const issue = result[0];
    expect(issue.id).toBe('ISS-001');
    expect(issue.title).toBe('NCR: Slump test');
    expect(issue.severity).toBe('high');
    expect(issue.status).toBe('open');
    expect(issue.assignee).toBe('inspector_a');
    expect(issue.linkedWbs).toBe('1.2.3');
    expect(issue.slaHours).toBe(48);
    expect(issue.tags).toEqual(['QC', 'NCR', 'AUTO']);
    expect(issue.sourceInspectionId).toBe('INS-1');
    expect(issue.sourceType).toBe('quality_auto_ncr');
    expect(issue.createdAt).toBe('2026-02-15');
    expect(issue.closedAt).toBeNull();
  });

  it('falls back to inspection.title when no checklist item failed', () => {
    const issues: Issue[] = [];
    const records = [
      makeRecord({
        id: 'INS-1',
        autoNCR: true,
        title: 'Concrete inspection',
        checklist: [makeChecklistItem({ result: 'pass' })],
      }),
    ];
    const result = synchronizeAutoNcrIssues(issues, records);
    expect(result[0].title).toBe('NCR: Concrete inspection');
  });

  it('falls back to a default Thai assignee when inspectors list is empty', () => {
    const issues: Issue[] = [];
    const records = [
      makeRecord({
        id: 'INS-1',
        autoNCR: true,
        inspectors: [],
        checklist: [makeChecklistItem({ item: 'fail item', result: 'fail' })],
      }),
    ];
    const result = synchronizeAutoNcrIssues(issues, records);
    expect(result[0].assignee).toBe('ผู้รับผิดชอบโครงการ');
  });

  it('ignores inspections where autoNCR is false', () => {
    const issues: Issue[] = [];
    const records = [
      makeRecord({ id: 'INS-1', autoNCR: false }),
    ];
    expect(synchronizeAutoNcrIssues(issues, records)).toEqual([]);
  });
});

describe('synchronizeAutoNcrIssues — matching existing issues', () => {
  it('matches by sourceInspectionId and merges QC + NCR tags without duplicates', () => {
    const existing = makeIssue({
      id: 'ISS-001',
      title: 'Unrelated',
      tags: ['QC', 'custom'],
      sourceInspectionId: 'INS-1',
    });
    const records = [
      makeRecord({
        id: 'INS-1',
        autoNCR: true,
        checklist: [makeChecklistItem({ item: 'slump', result: 'fail' })],
      }),
    ];
    const result = synchronizeAutoNcrIssues([existing], records);
    expect(result).toHaveLength(1);
    expect(result[0].tags).toEqual(['QC', 'custom', 'NCR']);
    expect(result[0].sourceInspectionId).toBe('INS-1');
    expect(result[0].sourceType).toBe('quality_auto_ncr');
  });

  it('matches when issue title contains a failed checklist item', () => {
    const existing = makeIssue({
      id: 'ISS-001',
      title: 'investigating slump issue',
    });
    const records = [
      makeRecord({
        id: 'INS-1',
        autoNCR: true,
        checklist: [makeChecklistItem({ item: 'slump', result: 'fail' })],
      }),
    ];
    const result = synchronizeAutoNcrIssues([existing], records);
    expect(result).toHaveLength(1);
    expect(result[0].sourceInspectionId).toBe('INS-1');
  });

  it('matches when failReason contains issue title (substring match both ways)', () => {
    const existing = makeIssue({ id: 'ISS-001', title: 'crack' });
    const records = [
      makeRecord({
        id: 'INS-1',
        autoNCR: true,
        failReason: 'Found a crack in the slab',
        checklist: [makeChecklistItem({ item: 'unrelated', result: 'pass' })],
      }),
    ];
    const result = synchronizeAutoNcrIssues([existing], records);
    expect(result).toHaveLength(1);
    expect(result[0].sourceInspectionId).toBe('INS-1');
  });

  it('matches when issue has NCR tag and linkedWbs equals inspection.wbsLink', () => {
    const existing = makeIssue({
      id: 'ISS-001',
      title: 'arbitrary title',
      linkedWbs: '1.2.3',
      tags: ['NCR'],
    });
    const records = [
      makeRecord({
        id: 'INS-1',
        autoNCR: true,
        wbsLink: '1.2.3',
        checklist: [makeChecklistItem({ item: 'unrelated', result: 'pass' })],
      }),
    ];
    const result = synchronizeAutoNcrIssues([existing], records);
    expect(result).toHaveLength(1);
    expect(result[0].sourceInspectionId).toBe('INS-1');
  });

  it('rejects matches across different projects', () => {
    const existing = makeIssue({
      id: 'ISS-001',
      projectId: 'P-OTHER',
      title: 'slump',
    });
    const records = [
      makeRecord({
        id: 'INS-1',
        projectId: 'P-TEST',
        autoNCR: true,
        checklist: [makeChecklistItem({ item: 'slump', result: 'fail' })],
      }),
    ];
    const result = synchronizeAutoNcrIssues([existing], records);
    expect(result).toHaveLength(2);
    expect(result[1].id).toBe('ISS-002');
  });
});

describe('removeAutoNcrIssuesForInspection', () => {
  it('removes all issues whose sourceInspectionId matches the given id', () => {
    const issues: Issue[] = [
      makeIssue({ id: 'ISS-001', sourceInspectionId: 'INS-X' }),
      makeIssue({ id: 'ISS-002', sourceInspectionId: 'INS-Y' }),
      makeIssue({ id: 'ISS-003', sourceInspectionId: 'INS-X' }),
      makeIssue({ id: 'ISS-004' }),
    ];
    const result = removeAutoNcrIssuesForInspection(issues, 'INS-X');
    expect(result).toBe(issues); // in-place mutation
    expect(issues.map((i) => i.id)).toEqual(['ISS-002', 'ISS-004']);
  });

  it('leaves issues untouched when no matching sourceInspectionId is present', () => {
    const issues: Issue[] = [
      makeIssue({ id: 'ISS-001', sourceInspectionId: 'INS-Y' }),
    ];
    removeAutoNcrIssuesForInspection(issues, 'INS-X');
    expect(issues).toHaveLength(1);
  });
});
