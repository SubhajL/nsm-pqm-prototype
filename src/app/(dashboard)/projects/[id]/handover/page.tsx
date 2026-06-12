import { HandoverClient } from './_components/HandoverClient';

/**
 * การส่งมอบ-รับมอบ (handover & O&M) route. Thin shell — all behaviour
 * lives in the client orchestrator. Surfaces the PR-26 backend: handover
 * packets (SOP 8.1 state machine + completeness gate), as-built drawings,
 * O&M manual entries, and asset registrations.
 */
export default function HandoverPage() {
  return <HandoverClient />;
}
