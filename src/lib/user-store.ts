/**
 * Edge-safe user lookup table.
 *
 * `middleware.ts` runs in the Next.js Edge runtime where the Postgres
 * client (Drizzle + postgres-js / pglite) is unavailable. It still needs
 * to resolve the cookie-bound `userId` → User for auth gating, so we keep
 * a read-only in-process view of the seed `users.json` here. This view is
 * NOT mutated at runtime — admin user CRUD writes go through the Database
 * repository like everything else; the middleware only checks that the
 * id resolves to a known active user.
 *
 * PR-21b: this file is the ONLY remaining in-memory store helper. Every
 * other `*-store.ts` module was retired with the Postgres cutover.
 */

import seedUsers from '@/data/users.json';
import type { User } from '@/types/admin';

const userTable: User[] = (seedUsers as User[]).map((user) => ({ ...user }));

export function getUserStore(): User[] {
  return userTable;
}
