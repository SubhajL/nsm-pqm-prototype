import { describe, expect, it } from 'vitest';

import { synchronizeMitigatingRiskIssues } from '@/lib/risk-issue-consistency';
import type { Issue, Risk } from '@/types/risk';

// ---------------------------------------------------------------------------
// Characterization tests: lock CURRENT behavior of synchronizeMitigatingRiskIssues,
// including its title-matching heuristics, side effects (mutates issues array),
// and auto-generated ID format.
// ---------------------------------------------------------------------------

function makeRisk(overrides: Partial<Risk>): Risk {
  return {
    id: overrides.id ?? 'R-1',
    projectId: overrides.projectId ?? 'P-TEST',
    title: overrides.title ?? 'Sample risk',
    description: overrides.description ?? '',
    likelihood: overrides.likelihood ?? 3,
    impact: overrides.impact ?? 3,
    score: overrides.score ?? 9,
    level: overrides.level ?? 'medium',
    status: overrides.status ?? 'mitigating',
    owner: overrides.owner ?? 'owner@example.com',
    dateIdentified: overrides.dateIdentified ?? '2026-01-15',
    mitigation: overrides.mitigation ?? '',
  };
}

function makeIssue(overrides: Partial<Issue>): Issue {
  return {
    id: overrides.id ?? 'ISS-001',
    projectId: overrides.projectId ?? 'P-TEST',
    title: overrides.title ?? 'Existing Issue',
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

describe('synchronizeMitigatingRiskIssues — creating new issues', () => {
  it('creates a new issue for each mitigating risk', () => {
    const issues: Issue[] = [];
    const risks = [
      makeRisk({ id: 'R-1', title: 'Concrete delay', level: 'high', status: 'mitigating' }),
    ];
    const result = synchronizeMitigatingRiskIssues(issues, risks);
    expect(result).toHaveLength(1);
    const created = result[0];
    expect(created.id).toBe('ISS-001');
    expect(created.title).toBe('Risk Mitigation: Concrete delay');
    expect(created.severity).toBe('high');
    expect(created.status).toBe('in_progress');
    expect(created.assignee).toBe('owner@example.com');
    expect(created.linkedWbs).toBe('-');
    expect(created.slaHours).toBe(48);
    expect(created.progress).toBe(25);
    expect(created.tags).toEqual(['RISK', 'MITIGATION', 'AUTO']);
    expect(created.sourceRiskId).toBe('R-1');
    expect(created.sourceType).toBe('risk_mitigation');
    expect(created.createdAt).toBe('2026-01-15');
    expect(created.closedAt).toBeNull();
  });

  it('skips risks that are not in "mitigating" status', () => {
    const issues: Issue[] = [];
    const risks = [
      makeRisk({ id: 'R-1', status: 'open' }),
      makeRisk({ id: 'R-2', status: 'closed' }),
      makeRisk({ id: 'R-3', status: 'accepted' }),
    ];
    expect(synchronizeMitigatingRiskIssues(issues, risks)).toEqual([]);
  });

  it('mutates the input issues array in place and returns the same reference', () => {
    const issues: Issue[] = [];
    const risks = [makeRisk({ status: 'mitigating' })];
    const result = synchronizeMitigatingRiskIssues(issues, risks);
    expect(result).toBe(issues);
    expect(issues).toHaveLength(1);
  });

  it('assigns ISS-XXX ids continuing from initial issues.length + 1', () => {
    // Distinct owners prevent the "assignee + risk tag" heuristic from collapsing the
    // newly created issues into one match.
    const issues = [
      makeIssue({ id: 'ISS-001' }),
      makeIssue({ id: 'ISS-002' }),
    ];
    const risks = [
      makeRisk({ id: 'R-A', title: 'Risk A', owner: 'owner-a', status: 'mitigating' }),
      makeRisk({ id: 'R-B', title: 'Risk B', owner: 'owner-b', status: 'mitigating' }),
    ];
    synchronizeMitigatingRiskIssues(issues, risks);
    expect(issues.map((i) => i.id)).toEqual(['ISS-001', 'ISS-002', 'ISS-003', 'ISS-004']);
  });

  it('maps risk level to severity per current mapping (critical+high→high, medium→medium, low→low)', () => {
    const issues: Issue[] = [];
    // Distinct owners required: the assignee + "RISK" tag heuristic would otherwise
    // collapse subsequent risks into the first generated issue.
    const risks = [
      makeRisk({ id: 'R-1', title: 'Critical', level: 'critical', owner: 'o1', status: 'mitigating' }),
      makeRisk({ id: 'R-2', title: 'High', level: 'high', owner: 'o2', status: 'mitigating' }),
      makeRisk({ id: 'R-3', title: 'Medium', level: 'medium', owner: 'o3', status: 'mitigating' }),
      makeRisk({ id: 'R-4', title: 'Low', level: 'low', owner: 'o4', status: 'mitigating' }),
    ];
    const result = synchronizeMitigatingRiskIssues(issues, risks);
    expect(result.map((i) => i.severity)).toEqual(['high', 'high', 'medium', 'low']);
  });

  it('maps risk level to SLA hours per current mapping (24/48/72/120)', () => {
    const issues: Issue[] = [];
    const risks = [
      makeRisk({ id: 'R-1', title: 'Critical', level: 'critical', owner: 'o1', status: 'mitigating' }),
      makeRisk({ id: 'R-2', title: 'High', level: 'high', owner: 'o2', status: 'mitigating' }),
      makeRisk({ id: 'R-3', title: 'Medium', level: 'medium', owner: 'o3', status: 'mitigating' }),
      makeRisk({ id: 'R-4', title: 'Low', level: 'low', owner: 'o4', status: 'mitigating' }),
    ];
    const result = synchronizeMitigatingRiskIssues(issues, risks);
    expect(result.map((i) => i.slaHours)).toEqual([24, 48, 72, 120]);
  });

  it('collapses subsequent risks into the first when assignee+RISK tag heuristic matches', () => {
    // Characterization quirk: when newly generated issues share the same owner, the
    // assignee+tag heuristic causes later risks to match the first generated issue
    // instead of creating new ones. Locking this behavior.
    const issues: Issue[] = [];
    const risks = [
      makeRisk({ id: 'R-1', title: 'A', owner: 'shared', status: 'mitigating' }),
      makeRisk({ id: 'R-2', title: 'B', owner: 'shared', status: 'mitigating' }),
    ];
    const result = synchronizeMitigatingRiskIssues(issues, risks);
    expect(result).toHaveLength(1);
    // Last risk wins for sourceRiskId update
    expect(result[0].sourceRiskId).toBe('R-2');
  });
});

describe('synchronizeMitigatingRiskIssues — matching existing issues', () => {
  it('matches by sourceRiskId (exact) and reopens a closed issue', () => {
    const existing = makeIssue({
      id: 'ISS-001',
      title: 'Unrelated title',
      status: 'closed',
      sourceRiskId: 'R-99',
    });
    const risks = [makeRisk({ id: 'R-99', title: 'Something', status: 'mitigating' })];
    const result = synchronizeMitigatingRiskIssues([existing], risks);
    expect(result).toHaveLength(1);
    expect(result[0].status).toBe('in_progress');
    expect(result[0].sourceRiskId).toBe('R-99');
    expect(result[0].sourceType).toBe('risk_mitigation');
  });

  it('matches when issue title contains the risk title (case-insensitive)', () => {
    const existing = makeIssue({
      id: 'ISS-001',
      title: 'Risk Mitigation: Concrete Delay update',
      status: 'open',
    });
    const risks = [makeRisk({ id: 'R-1', title: 'concrete delay', status: 'mitigating' })];
    const result = synchronizeMitigatingRiskIssues([existing], risks);
    expect(result).toHaveLength(1);
    expect(result[0].sourceRiskId).toBe('R-1');
  });

  it('matches when risk title contains the issue title', () => {
    const existing = makeIssue({ id: 'ISS-001', title: 'delay' });
    const risks = [makeRisk({ id: 'R-2', title: 'Concrete delay incident', status: 'mitigating' })];
    const result = synchronizeMitigatingRiskIssues([existing], risks);
    expect(result).toHaveLength(1);
    expect(result[0].sourceRiskId).toBe('R-2');
  });

  it('matches when assignee == owner AND issue has a "risk" tag', () => {
    const existing = makeIssue({
      id: 'ISS-001',
      title: 'Some unrelated heading',
      assignee: 'shared.owner@example.com',
      tags: ['Risk', 'foo'],
    });
    const risks = [
      makeRisk({
        id: 'R-1',
        title: 'Brand new title',
        owner: 'shared.owner@example.com',
        status: 'mitigating',
      }),
    ];
    const result = synchronizeMitigatingRiskIssues([existing], risks);
    expect(result).toHaveLength(1);
    expect(result[0].sourceRiskId).toBe('R-1');
  });

  it('rejects matches across different projects', () => {
    const existing = makeIssue({
      id: 'ISS-001',
      projectId: 'P-OTHER',
      title: 'Risk Mitigation: same',
    });
    const risks = [
      makeRisk({ id: 'R-1', projectId: 'P-TEST', title: 'same', status: 'mitigating' }),
    ];
    const result = synchronizeMitigatingRiskIssues([existing], risks);
    // Different project → no match → new issue appended
    expect(result).toHaveLength(2);
    expect(result[1].id).toBe('ISS-002');
  });

  it('merges RISK and MITIGATION tags into existing tags without duplicates', () => {
    const existing = makeIssue({
      id: 'ISS-001',
      title: 'Risk Mitigation: same',
      tags: ['MITIGATION', 'custom'],
    });
    const risks = [makeRisk({ id: 'R-1', title: 'same', status: 'mitigating' })];
    const result = synchronizeMitigatingRiskIssues([existing], risks);
    expect(result[0].tags).toEqual(['MITIGATION', 'custom', 'RISK']);
  });

  it('does not change status of an existing non-closed issue', () => {
    const existing = makeIssue({
      id: 'ISS-001',
      title: 'Risk Mitigation: open issue',
      status: 'open',
    });
    const risks = [makeRisk({ id: 'R-1', title: 'open issue', status: 'mitigating' })];
    const result = synchronizeMitigatingRiskIssues([existing], risks);
    expect(result[0].status).toBe('open');
  });

  it('treats whitespace differences as a match (normalized title)', () => {
    const existing = makeIssue({
      id: 'ISS-001',
      title: 'risk mitigation:    concrete   delay',
    });
    const risks = [makeRisk({ id: 'R-1', title: 'Concrete delay', status: 'mitigating' })];
    const result = synchronizeMitigatingRiskIssues([existing], risks);
    expect(result).toHaveLength(1);
    expect(result[0].sourceRiskId).toBe('R-1');
  });
});
