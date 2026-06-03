import { WorkPeriodsClient } from './_components/WorkPeriodsClient';

/**
 * งวดงาน (work-period) payment-flow route. Thin shell — all behaviour
 * lives in the client orchestrator. Gated server-side by
 * `FEATURE_RID_PAYMENT_FLOW` (the API answers 503 when off) and surfaced
 * in the nav only when `NEXT_PUBLIC_FEATURE_RID_PAYMENT_FLOW` is on.
 */
export default function WorkPeriodsPage() {
  return <WorkPeriodsClient />;
}
