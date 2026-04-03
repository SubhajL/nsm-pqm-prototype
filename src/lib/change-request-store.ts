import seedChangeRequests from '@/data/change-requests.json';
import { generatedChangeRequests } from '@/lib/generated-project-data';
import type { ChangeRequest } from '@/types/document';

declare global {
  // eslint-disable-next-line no-var
  var __nsmChangeRequestStore: ChangeRequest[] | undefined;
}

export function getChangeRequestStore() {
  if (!globalThis.__nsmChangeRequestStore) {
    globalThis.__nsmChangeRequestStore = [
      ...(seedChangeRequests as ChangeRequest[]),
      ...generatedChangeRequests,
    ];
  }

  return globalThis.__nsmChangeRequestStore;
}

export function addChangeRequest(changeRequest: ChangeRequest) {
  const store = getChangeRequestStore();
  store.unshift(changeRequest);
  return changeRequest;
}

export function updateChangeRequest(
  changeRequestId: string,
  updates: Partial<Omit<ChangeRequest, 'id'>>,
) {
  const store = getChangeRequestStore();
  const index = store.findIndex((changeRequest) => changeRequest.id === changeRequestId);

  if (index < 0) {
    return null;
  }

  store[index] = {
    ...store[index],
    ...updates,
  };

  return store[index];
}
