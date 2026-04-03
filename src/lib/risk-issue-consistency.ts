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

export function synchronizeMitigatingRiskIssues(issues: Issue[], risks: Risk[]) {
  let nextIssueNumber = issues.length + 1;

  risks
    .filter((risk) => risk.status === 'mitigating')
    .forEach((risk) => {
      const existingIssue = issues.find((issue) => isMatchingRiskIssue(issue, risk));

      if (existingIssue) {
        existingIssue.status = existingIssue.status === 'closed' ? 'in_progress' : existingIssue.status;
        existingIssue.tags = uniqueTags([...(existingIssue.tags ?? []), 'RISK', 'MITIGATION']);
        existingIssue.sourceRiskId = risk.id;
        existingIssue.sourceType = 'risk_mitigation';
        return;
      }

      issues.push(buildRiskIssue(risk, nextIssueNumber));
      nextIssueNumber += 1;
    });

  return issues;
}
