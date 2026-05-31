/**
 * PR-25 — Public Hearing record.
 *
 * One row per stakeholder consultation event. Captures attendance, location,
 * and a free-text Thai summary plus an optional link to the signed
 * minutes-of-meeting document (resolved via DocumentFile.id).
 */

export interface PublicHearing {
  id: string;
  projectId: string;
  /** ISO date string (CE) when the hearing was held. */
  heldAt: string;
  location: string;
  attendeeCount: number;
  /** Free-text Thai summary. */
  summary: string;
  /** Resolved `DocumentFile.id` when minutes are attached, else null. */
  signedMinuteDocId: string | null;
}
