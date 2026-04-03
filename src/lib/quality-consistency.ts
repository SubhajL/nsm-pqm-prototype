import type { Issue } from '@/types/risk';
import type { InspectionRecord, InspectionsData, ITPItem, ITPStatus } from '@/types/quality';

function inspectionTimestamp(record: Pick<InspectionRecord, 'date' | 'time'>) {
  const time = record.time?.trim() || '00:00';
  return `${record.date}T${time}`;
}

function normalizeText(value: string | undefined) {
  return (value ?? '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLocaleLowerCase();
}

function uniqueTags(tags: string[] | undefined) {
  return Array.from(new Set((tags ?? []).filter(Boolean)));
}

export function deriveItpStatusFromInspectionRecords(
  item: Pick<ITPItem, 'id' | 'status'>,
  inspectionRecords: InspectionRecord[],
): ITPStatus {
  const linkedRecords = inspectionRecords
    .filter((record) => record.itpId === item.id)
    .sort((left, right) =>
      inspectionTimestamp(left).localeCompare(inspectionTimestamp(right)),
    );

  if (linkedRecords.length === 0) {
    return item.status;
  }

  const latestRecord = linkedRecords[linkedRecords.length - 1];
  return latestRecord.overallResult === 'pass' ? 'passed' : 'conditional';
}

export function synchronizeItpStatuses(data: InspectionsData) {
  data.itpItems.forEach((item) => {
    item.status = deriveItpStatusFromInspectionRecords(item, data.inspectionRecords);
  });

  return data;
}

function getAutoNcrIssueTitle(inspection: InspectionRecord) {
  const firstFailedItem = inspection.checklist.find((item) => item.result === 'fail');
  if (firstFailedItem) {
    return `NCR: ${firstFailedItem.item}`;
  }

  return `NCR: ${inspection.title}`;
}

function isMatchingAutoNcrIssue(issue: Issue, inspection: InspectionRecord) {
  if (issue.projectId !== inspection.projectId) {
    return false;
  }

  if (issue.sourceInspectionId === inspection.id) {
    return true;
  }

  const issueTitle = normalizeText(issue.title);
  const failReason = normalizeText(inspection.failReason);
  const failedItems = inspection.checklist
    .filter((item) => item.result === 'fail')
    .map((item) => normalizeText(item.item));
  const hasNcrTag = (issue.tags ?? []).some((tag) => normalizeText(tag) === 'ncr');

  return (
    failedItems.some((item) => issueTitle.includes(item) || item.includes(issueTitle)) ||
    (failReason.length > 0 &&
      (issueTitle.includes(failReason) || failReason.includes(issueTitle))) ||
    (hasNcrTag && normalizeText(issue.linkedWbs) === normalizeText(inspection.wbsLink))
  );
}

function buildAutoNcrIssue(
  inspection: InspectionRecord,
  nextIssueNumber: number,
): Issue {
  return {
    id: `ISS-${String(nextIssueNumber).padStart(3, '0')}`,
    projectId: inspection.projectId,
    title: getAutoNcrIssueTitle(inspection),
    severity: 'high',
    status: 'open',
    assignee: inspection.inspectors[0] ?? 'ผู้รับผิดชอบโครงการ',
    linkedWbs: inspection.wbsLink,
    slaHours: 48,
    tags: ['QC', 'NCR', 'AUTO'],
    createdAt: inspection.date,
    closedAt: null,
    sourceInspectionId: inspection.id,
    sourceType: 'quality_auto_ncr',
  };
}

export function synchronizeAutoNcrIssues(
  issues: Issue[],
  inspectionRecords: InspectionRecord[],
) {
  let nextIssueNumber = issues.length + 1;

  inspectionRecords
    .filter((inspection) => inspection.autoNCR)
    .forEach((inspection) => {
      const existingIssue = issues.find((issue) =>
        isMatchingAutoNcrIssue(issue, inspection),
      );

      if (existingIssue) {
        existingIssue.tags = uniqueTags([...(existingIssue.tags ?? []), 'QC', 'NCR']);
        existingIssue.sourceInspectionId = inspection.id;
        existingIssue.sourceType = 'quality_auto_ncr';
        return;
      }

      issues.push(buildAutoNcrIssue(inspection, nextIssueNumber));
      nextIssueNumber += 1;
    });

  return issues;
}

export function removeAutoNcrIssuesForInspection(
  issues: Issue[],
  inspectionId: string,
) {
  for (let index = issues.length - 1; index >= 0; index -= 1) {
    if (issues[index].sourceInspectionId === inspectionId) {
      issues.splice(index, 1);
    }
  }

  return issues;
}
