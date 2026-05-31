/**
 * PR-24 — Contractor pre-qualification record (PQ-AHP reference).
 *
 * Captures the result of pre-qualifying a contractor for upcoming
 * solicitations at the project level. The full AHP (Analytic Hierarchy
 * Process) scoring engine is deferred post-MVP; for now we only store the
 * summary score plus evidence document ids so the register can be wired up
 * without blocking on the scoring module.
 *
 * `ahpScore` is nullable because nothing computes it yet — once the AHP
 * module lands it will populate this field and remain nullable for legacy
 * records.
 */

export interface ContractorPrequalification {
  id: string;
  /** Project that performed the pre-qualification. */
  projectId: string;
  contractorName: string;
  /** 13-digit Thai tax id; nullable for contractors without one on file. */
  contractorTaxId: string | null;
  /** ISO date string (CE) when pre-qualification was completed. */
  prequalifiedAt: string;
  /** ISO date string (CE) end of validity; null = open-ended. */
  validUntil: string | null;
  /** Aggregate AHP score (0–1 or 0–100, scoring system TBD). Nullable until module lands. */
  ahpScore: number | null;
  /** DocumentFile.id list backing the evidence package. */
  evidenceDocIds: string[];
  notes: string;
}
