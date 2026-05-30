/**
 * PR-18 — Repository abstraction layer.
 *
 * Every persistent collection in the app is reached through a repository
 * interface rather than the raw `getXxxStore()` helpers. This is the
 * strangler-fig setup that lets PR-19 swap in a Postgres-backed
 * implementation without touching API routes.
 *
 * Conventions:
 *   - All methods return `Promise<T>`. The InMemory implementations resolve
 *     synchronously, but the async signature mirrors what the DB impls will
 *     need (and prevents call-sites from accidentally relying on synchronous
 *     completion ordering once the DB swap lands).
 *   - The InMemory implementations are thin wrappers around the existing
 *     `src/lib/*-store.ts` modules — they do NOT replace the stores in PR-18.
 *     Deletion of the underlying stores is PR-21's job (after DB cutover).
 *   - InMemory repository methods return references to the same objects
 *     the stores return; mutations happen in place (matching the pre-PR-18
 *     behavior where API routes mutated store array entries directly).
 *     Database repository methods return freshly-hydrated copies — callers
 *     must use explicit `.update()` calls to persist changes there.
 *
 * Standard surface (CRUD) per repository:
 *   findById(id)       returns the entity or null
 *   list(filter?)      returns the full collection, optionally filtered
 *   create(entity)     appends and returns the persisted entity
 *   update(id, patch)  patches in place, returns the patched entity or null
 *   delete(id)         removes and returns the deleted entity or null
 *
 * Domain-specific methods (e.g. lockVersion on documents) extend the base
 * surface as needed.
 */

export interface Repository<T, Id = string> {
  findById(id: Id): Promise<T | null>;
  list(): Promise<T[]>;
  create(entity: T): Promise<T>;
  update(id: Id, patch: Partial<T>): Promise<T | null>;
  delete(id: Id): Promise<T | null>;
}
