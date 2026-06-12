import { ProcurementClient } from './_components/ProcurementClient';

/**
 * จัดซื้อจัดจ้าง (procurement & contracts) route. Thin shell — all
 * behaviour lives in the client orchestrator. Surfaces the PR-24 backend:
 * procurement packages (+ TOR revisions, engineering estimates, state
 * transitions), awarded contracts (+ amendments), and contractor
 * prequalifications.
 */
export default function ProcurementPage() {
  return <ProcurementClient />;
}
