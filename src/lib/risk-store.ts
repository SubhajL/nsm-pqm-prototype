import seedRisks from '@/data/risks.json';
import { generatedRisks } from '@/lib/generated-project-data';
import type { Risk } from '@/types/risk';

declare global {
  // eslint-disable-next-line no-var
  var __nsmRiskStore: Risk[] | undefined;
}

export function getRiskStore() {
  if (!globalThis.__nsmRiskStore) {
    globalThis.__nsmRiskStore = [
      ...(seedRisks as Risk[]),
      ...generatedRisks,
    ];
  }

  return globalThis.__nsmRiskStore;
}
