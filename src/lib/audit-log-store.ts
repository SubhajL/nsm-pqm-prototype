import seedAuditLogs from '@/data/audit-logs.json';
import type { AuditLog, User } from '@/types/admin';

declare global {
  // eslint-disable-next-line no-var
  var __nsmAuditLogStore: AuditLog[] | undefined;
}

function cloneAuditLog(log: AuditLog): AuditLog {
  return { ...log };
}

export function getAuditLogStore() {
  if (!globalThis.__nsmAuditLogStore) {
    globalThis.__nsmAuditLogStore = (seedAuditLogs as AuditLog[]).map(cloneAuditLog);
  }

  return globalThis.__nsmAuditLogStore;
}

export function appendAuditLog(
  user: User | null,
  module: string,
  action: string,
) {
  const store = getAuditLogStore();

  const nextLog: AuditLog = {
    id: `log-${crypto.randomUUID()}`,
    userId: user?.id ?? 'system',
    userName: user?.name ?? 'System',
    ip: '127.0.0.1',
    os: 'Web',
    module,
    action,
    timestamp: new Date().toISOString(),
  };

  store.unshift(nextLog);
  return nextLog;
}
