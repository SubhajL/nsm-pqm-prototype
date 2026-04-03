import { getAuditLogStore } from '@/lib/audit-log-store';
import type { AuditLog } from '@/types/admin';

export async function GET(request: Request) {
  await new Promise((resolve) => setTimeout(resolve, 150));
  const store: AuditLog[] = [...getAuditLogStore()];

  const { searchParams } = new URL(request.url);
  const moduleFilter = searchParams.get('module');
  const search = searchParams.get('search')?.toLowerCase();
  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');

  let filtered = [...store];

  if (moduleFilter) {
    filtered = filtered.filter((log) => log.module === moduleFilter);
  }

  if (search) {
    filtered = filtered.filter(
      (log) =>
        log.userName.toLowerCase().includes(search) ||
        log.action.toLowerCase().includes(search) ||
        log.module.toLowerCase().includes(search) ||
        log.ip.includes(search),
    );
  }

  if (startDate) {
    filtered = filtered.filter((log) => log.timestamp >= startDate);
  }

  if (endDate) {
    const endDateEnd = endDate + 'T23:59:59';
    filtered = filtered.filter((log) => log.timestamp <= endDateEnd);
  }

  // Sort newest first
  filtered.sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
  );

  return Response.json({ status: 'success', data: filtered });
}
