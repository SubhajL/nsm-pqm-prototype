import type { RepositoryRegistry } from '@/lib/repositories';
import type { Issue, Risk } from '@/types/risk';

function normalizeText(value: string | undefined) {
  return (value ?? '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLocaleLowerCase();
}

function uniqueTags(tags: string[] | undefined) {
  return Array.from(new Set((tags ?? []).filter(Boolean)));
}

function getRiskIssueSeverity(level: Risk['level']): Issue['severity'] {
  if (level === 'critical' || level === 'high') {
    return 'high';
  }
  if (level === 'medium') {
    return 'medium';
  }
  return 'low';
}

function getRiskIssueSlaHours(level: Risk['level']) {
  if (level === 'critical') {
    return 24;
  }
  if (level === 'high') {
    return 48;
  }
  if (level === 'medium') {
    return 72;
  }
  return 120;
}

function getRiskIssueTitle(risk: Risk) {
  return `Risk Mitigation: ${risk.title}`;
}

function isMatchingRiskIssue(issue: Issue, risk: Risk) {
  if (issue.projectId !== risk.projectId) {
    return false;
  }

  if (issue.sourceRiskId === risk.id) {
    return true;
  }

  const issueTitle = normalizeText(issue.title);
  const riskTitle = normalizeText(risk.title);

  return (
    issueTitle.includes(riskTitle) ||
    riskTitle.includes(issueTitle) ||
    (issue.assignee === risk.owner &&
      (issue.tags ?? []).some((tag) => normalizeText(tag) === 'risk'))
  );
}

function buildRiskIssue(risk: Risk, nextIssueNumber: number): Issue {
  return {
    id: `ISS-${String(nextIssueNumber).padStart(3, '0')}`,
    projectId: risk.projectId,
    title: getRiskIssueTitle(risk),
    severity: getRiskIssueSeverity(risk.level),
    status: 'in_progress',
    assignee: risk.owner,
    linkedWbs: '-',
    slaHours: getRiskIssueSlaHours(risk.level),
    progress: 25,
    tags: ['RISK', 'MITIGATION', 'AUTO'],
    sourceRiskId: risk.id,
    sourceType: 'risk_mitigation',
    createdAt: risk.dateIdentified,
    closedAt: null,
  };
}

/**
 * Pure planner: given a snapshot of issues + risks, computes the set of
 * patches that should be applied (creates new + patches existing). Does
 * NOT mutate inputs; the caller is expected to dispatch these through
 * the repo.
 */
export function planMitigatingRiskIssueChanges(issues: Issue[], risks: Risk[]) {
  // Work against a mutable copy of the issues list so that the original
  // characterisation behaviour (newly-created issues participate in
  // subsequent risk matches) is preserved.
  const working: Issue[] = issues.map((issue) => ({ ...issue }));
  const patchById = new Map<string, Partial<Issue>>();
  const creates: Issue[] = [];
  let nextIssueNumber = working.length + 1;

  risks
    .filter((risk) => risk.status === 'mitigating')
    .forEach((risk) => {
      const existingIssue = working.find((issue) => isMatchingRiskIssue(issue, risk));

      if (existingIssue) {
        const patch: Partial<Issue> = {
          status:
            existingIssue.status === 'closed' ? 'in_progress' : existingIssue.status,
          tags: uniqueTags([...(existingIssue.tags ?? []), 'RISK', 'MITIGATION']),
          sourceRiskId: risk.id,
          sourceType: 'risk_mitigation',
        };
        Object.assign(existingIssue, patch);
        // Merge with any earlier patch for the same id.
        const earlier = patchById.get(existingIssue.id) ?? {};
        patchById.set(existingIssue.id, { ...earlier, ...patch });
        return;
      }

      const created = buildRiskIssue(risk, nextIssueNumber);
      creates.push(created);
      working.push(created);
      nextIssueNumber += 1;
    });

  const patches = Array.from(patchById.entries()).map(([id, patch]) => ({ id, patch }));
  return { creates, patches };
}

/**
 * Backwards-compatible mutating helper. Still in-place — used by unit tests
 * that pass an arbitrary array and assert on the mutated result. Routes
 * MUST NOT call this against an array obtained from a repo (it won't be
 * written back to the DB). Routes should call `applyMitigatingRiskIssues`
 * instead.
 */
export function synchronizeMitigatingRiskIssues(issues: Issue[], risks: Risk[]) {
  const { creates, patches } = planMitigatingRiskIssueChanges(issues, risks);
  for (const patch of patches) {
    const issue = issues.find((entry) => entry.id === patch.id);
    if (issue) Object.assign(issue, patch.patch);
  }
  for (const create of creates) {
    issues.push(create);
  }
  return issues;
}

/**
 * Repository-aware variant for API routes: persists creates + patches via
 * the issues repository so the writes survive against any backend.
 */
export async function applyMitigatingRiskIssues(
  repos: Pick<RepositoryRegistry, 'issues'>,
  issuesSnapshot: Issue[],
  risks: Risk[],
): Promise<void> {
  const { creates, patches } = planMitigatingRiskIssueChanges(issuesSnapshot, risks);
  for (const patch of patches) {
    await repos.issues.update(patch.id, patch.patch);
  }
  for (const create of creates) {
    await repos.issues.create(create);
  }
}
