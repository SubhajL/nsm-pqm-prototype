import seedIssues from '@/data/issues.json';
import { generatedIssues } from '@/lib/generated-project-data';
import { getQualityStore } from '@/lib/quality-store';
import { synchronizeAutoNcrIssues } from '@/lib/quality-consistency';
import { getRiskStore } from '@/lib/risk-store';
import { synchronizeMitigatingRiskIssues } from '@/lib/risk-issue-consistency';
import type { Issue } from '@/types/risk';

declare global {
  // eslint-disable-next-line no-var
  var __nsmIssueStore: Issue[] | undefined;
}

export function getIssueStore() {
  if (!globalThis.__nsmIssueStore) {
    globalThis.__nsmIssueStore = [
      ...(seedIssues as Issue[]),
      ...generatedIssues,
    ];
    synchronizeMitigatingRiskIssues(globalThis.__nsmIssueStore, getRiskStore());
    synchronizeAutoNcrIssues(globalThis.__nsmIssueStore, getQualityStore().inspectionRecords);
  }

  return globalThis.__nsmIssueStore;
}
