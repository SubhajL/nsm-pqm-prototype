import seedUsers from '@/data/users.json';
import type { User } from '@/types/admin';

declare global {
  // eslint-disable-next-line no-var
  var __nsmUserStore: User[] | undefined;
}

function cloneUser(user: User): User {
  return { ...user };
}

export function getUserStore() {
  if (!globalThis.__nsmUserStore) {
    globalThis.__nsmUserStore = (seedUsers as User[]).map(cloneUser);
  }

  return globalThis.__nsmUserStore;
}

export function getUserById(userId: string) {
  return getUserStore().find((user) => user.id === userId) ?? null;
}

export function addUser(user: User) {
  const store = getUserStore();
  store.push(user);
  return user;
}

export function updateUser(
  userId: string,
  updates: Partial<Omit<User, 'id'>>,
) {
  const store = getUserStore();
  const index = store.findIndex((user) => user.id === userId);

  if (index < 0) {
    return null;
  }

  store[index] = {
    ...store[index],
    ...updates,
  };

  return store[index];
}
