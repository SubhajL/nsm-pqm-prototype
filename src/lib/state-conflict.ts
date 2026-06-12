/**
 * PR-34 — shared 409 envelope for compare-and-swap losers.
 *
 * Transition routes pre-check the state machine, then apply the write
 * via `updateIfState(id, expectedState, patch)`. When the conditional
 * UPDATE matches zero rows, another user transitioned the record between
 * the pre-check and the write — the caller should refresh and re-decide,
 * not silently overwrite.
 */

/** Sentinel thrown inside `withTransactionalAudit` callbacks to abort + roll back. */
export const STATE_CONFLICT = Symbol('STATE_CONFLICT');

export function stateConflictResponse(resourceLabel: string): Response {
  return Response.json(
    {
      status: 'error',
      error: {
        code: 'STATE_CONFLICT',
        message:
          `${resourceLabel} ถูกเปลี่ยนสถานะโดยผู้ใช้อื่นแล้ว (modified by another user) — ` +
          'โปรดรีเฟรชหน้าจอแล้วลองอีกครั้ง (refresh and retry)',
      },
    },
    { status: 409 },
  );
}

/** SQLSTATE 23505 detector for unique-index races (server-side sequences). */
export function isUniqueViolation(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const candidate = error as {
    code?: string;
    cause?: { code?: string };
    message?: string;
  };
  return (
    candidate.code === '23505' ||
    candidate.cause?.code === '23505' ||
    /duplicate key value/i.test(candidate.message ?? '')
  );
}
