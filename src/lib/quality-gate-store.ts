import seedQualityGates from '@/data/quality-gates.json';
import { generatedQualityGates } from '@/lib/generated-project-data';
import type { QualityGate } from '@/types/quality';

declare global {
  // eslint-disable-next-line no-var
  var __nsmQualityGateStore: QualityGate[] | undefined;
}

export function getQualityGateStore() {
  if (!globalThis.__nsmQualityGateStore) {
    globalThis.__nsmQualityGateStore = [
      ...(seedQualityGates as QualityGate[]),
      ...generatedQualityGates,
    ];
  }

  return globalThis.__nsmQualityGateStore;
}
