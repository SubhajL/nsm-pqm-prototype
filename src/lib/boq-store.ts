import seedBoqItems from '@/data/boq.json';
import { generatedBoqItems } from '@/lib/generated-project-data';
import type { BOQItem } from '@/hooks/useBOQ';

declare global {
  // eslint-disable-next-line no-var
  var __nsmBoqStore: BOQItem[] | undefined;
}

export function getBoqStore() {
  if (!globalThis.__nsmBoqStore) {
    globalThis.__nsmBoqStore = [
      ...(seedBoqItems as BOQItem[]),
      ...(generatedBoqItems as BOQItem[]),
    ];
  }

  return globalThis.__nsmBoqStore;
}
