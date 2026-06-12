import { PermitsLandClient } from './_components/PermitsLandClient';

/**
 * ใบอนุญาตและที่ดิน (permits & land readiness) route. Thin shell — all
 * behaviour lives in the client orchestrator. Surfaces the PR-25 backend
 * registers: permits, public hearings, land acquisition, and
 * environmental assessments (EIA / IEE).
 */
export default function PermitsPage() {
  return <PermitsLandClient />;
}
