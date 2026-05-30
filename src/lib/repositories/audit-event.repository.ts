import type { AuditEvent } from '@/types/audit';

/**
 * The audit event log is APPEND-ONLY by contract (PR-05). The repository
 * intentionally exposes only `list` + `append` — there is no `update` or
 * `delete` surface. Tests rely on this invariant; do NOT add mutators.
 */
export interface AuditEventRepository {
  list(): Promise<AuditEvent[]>;
  append(
    event: Omit<AuditEvent, 'id' | 'timestamp'> &
      Partial<Pick<AuditEvent, 'id' | 'timestamp'>>,
    options?: { id?: string; timestamp?: string },
  ): Promise<AuditEvent>;
}
